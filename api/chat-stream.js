// Vercel Edge Runtime — Groq (Llama 3.3 70B) RAG + SSE streaming
export const config = { runtime: 'edge' };

// ── IP-based token-bucket rate limiter ─────────────────────────────────────
// Max 10 requests / 60 s per IP. Capped at MAX_BUCKETS entries to bound
// memory in long-running isolates; oldest entry is evicted on overflow.
const buckets = new Map(); // ip → { tokens, lastRefill }
const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;
const MAX_BUCKETS = 10_000;

/** Exposed only for test isolation — do not call in production paths. */
export function _testOnly_clearBuckets() {
  buckets.clear();
}

function isRateLimited(ip) {
  const now = Date.now();
  let bucket = buckets.get(ip);

  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
      // Evict the oldest insertion-order entry
      buckets.delete(buckets.keys().next().value);
    }
    bucket = { tokens: RATE_LIMIT, lastRefill: now };
  } else if (now - bucket.lastRefill >= WINDOW_MS) {
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

// ── System prompt factory ──────────────────────────────────────────────────
export function buildSystemPrompt(procedureDoc, language) {
  const langKey = language === 'fr' ? 'fr' : 'en';
  const langLabel = langKey === 'fr' ? 'French' : 'English';
  const procedureName = procedureDoc.name?.[langKey] ?? procedureDoc.procedure_code;

  // Project only the language-specific slice to minimise context tokens
  const docSlice = {
    name: procedureDoc.name?.[langKey],
    target_office: procedureDoc.target_office?.[langKey],
    official_cost_cfa: procedureDoc.official_cost_cfa,
    estimated_timeline: procedureDoc.estimated_timeline?.[langKey],
    required_documents: procedureDoc.required_documents?.[langKey],
    steps: procedureDoc.steps?.[langKey],
  };

  return `You are ProcedureBot CM, a civic assistant specialising in Cameroonian administrative procedures. You are currently loaded with the document for: "${procedureName}".

STRICT RULES — follow all without exception:
1. GROUND TRUTH ONLY: Answer exclusively from the PROCEDURE DOCUMENT below. Never invent, extrapolate, or infer costs, timelines, steps, or document requirements not present in the document.
2. MISSING INFORMATION: If the user asks about something absent from the document, respond exactly: "This information is not available in the current procedure document."
3. OFF-TOPIC REDIRECT: If the query concerns a different procedure or an unrelated topic, provide at most one sentence of general administrative context, then instruct the user: "Please select the relevant procedure from the dropdown menu at the top of the page."
4. LANGUAGE: Respond entirely in ${langLabel}. Never mix languages in a single response.
5. NO HALLUCINATION: Never guess, estimate, or use hedging phrases such as "probably", "I think", or "it might be".

PROCEDURE DOCUMENT:
${JSON.stringify(docSlice, null, 2)}`;
}

// ── Edge handler ────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  if (isRateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
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
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const normalizedLang = language === 'fr' ? 'fr' : 'en';

  // ── DB lookup (dynamic import keeps mongoose out of the Edge cold-start path)
  const { default: mongoose } = await import('mongoose');
  const { Procedure } = await import('../lib/schema.js');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  const procedure = await Procedure.findOne({ procedure_code }).lean();

  if (!procedure) {
    return new Response(
      JSON.stringify({ error: `Procedure '${procedure_code}' not found.` }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── DeepSeek streaming ────────────────────────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const enqueue = (payload) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      try {
        const dsRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            stream: true,
            messages: [
              { role: 'system', content: buildSystemPrompt(procedure, normalizedLang) },
              { role: 'user', content: message },
            ],
          }),
        });

        if (!dsRes.ok) {
          const errText = await dsRes.text();
          enqueue({ error: errText });
        } else {
          const reader = dsRes.body.getReader();
          const dec = new TextDecoder();
          let buf = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop(); // keep incomplete last line
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed === 'data: [DONE]') continue;
              if (trimmed.startsWith('data: ')) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const text = json.choices?.[0]?.delta?.content;
                  if (text) enqueue({ text });
                } catch { /* skip malformed chunk */ }
              }
            }
          }
        }
      } catch (err) {
        enqueue({ error: err.message ?? 'Streaming error.' });
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
      'X-Accel-Buffering': 'no',
    },
  });
}
