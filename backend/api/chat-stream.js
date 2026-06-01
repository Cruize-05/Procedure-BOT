// Vercel Edge Runtime — Gemini RAG + SSE streaming
export const config = { runtime: 'edge' };

import { GoogleGenerativeAI } from '@google/generative-ai';

// ── IP-based token-bucket rate limiter (10 req / 60 s per IP) ──────────────
const buckets = new Map(); // ip → { tokens, lastRefill }
const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = buckets.get(ip) ?? { tokens: RATE_LIMIT, lastRefill: now };

  const elapsed = now - bucket.lastRefill;
  if (elapsed >= WINDOW_MS) {
    bucket.tokens = RATE_LIMIT;
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    buckets.set(ip, bucket);
    return true;
  }

  bucket.tokens -= 1;
  buckets.set(ip, bucket);
  return false;
}

// ── System prompt factory ───────────────────────────────────────────────────
function buildSystemPrompt(procedureDoc, language) {
  const lang = language === 'fr' ? 'French' : 'English';
  const content = JSON.stringify(procedureDoc[language] ?? {});

  return `You are ProcedureBot CM, a civic assistant specialising in Cameroonian administrative procedures.

STRICT RULES:
1. Answer ONLY using the procedure document provided below. Never invent costs, timelines, or steps.
2. If the answer is not in the document, say so explicitly.
3. If the query is off-topic, provide minimal general context and tell the user to select a different procedure from the top dropdown.
4. Always respond in ${lang}.

PROCEDURE DOCUMENT:
${content}`;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { procedure_code, language = 'en', message } = body ?? {};

  if (!procedure_code || !message) {
    return new Response(
      JSON.stringify({ error: '`procedure_code` and `message` are required.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Lazy MongoDB import — edge runtime supports dynamic import
  const { default: mongoose } = await import('mongoose');
  const { Procedure } = await import('../shared/schema.js');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  const procedure = await Procedure.findOne({ procedure_code }).lean();

  if (!procedure) {
    return new Response(
      JSON.stringify({ error: `Procedure '${procedure_code}' not found.` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const systemPrompt = buildSystemPrompt(procedure, language);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        const result = await model.generateContentStream([
          { text: systemPrompt },
          { text: message },
        ]);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            const ssePayload = `data: ${JSON.stringify({ text })}\n\n`;
            controller.enqueue(encoder.encode(ssePayload));
          }
        }
      } catch (err) {
        const errPayload = `data: ${JSON.stringify({ error: err.message })}\n\n`;
        controller.enqueue(encoder.encode(errPayload));
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
