/**
 * Unit tests for the Vercel Edge Function: /backend/api/chat-stream.js
 *
 * Strategy:
 *  - @google/genai and mongoose are fully mocked — no network or DB calls.
 *  - The Web Streams API (ReadableStream, TextEncoder/Decoder, Request/Response)
 *    is available natively in Node ≥ 18.
 *  - vi.hoisted ensures mock fn references are available inside vi.mock factories,
 *    which are hoisted before imports by Vitest's transform.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mock references ────────────────────────────────────────────────
const mockGenerateContentStream = vi.hoisted(() => vi.fn());
const mockFindOne = vi.hoisted(() => vi.fn());

// ── Module mocks ───────────────────────────────────────────────────────────
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContentStream: mockGenerateContentStream },
  })),
}));

vi.mock('mongoose', () => ({
  default: {
    connection: { readyState: 1 }, // simulate already-connected
    connect: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../lib/schema.js', () => ({
  Procedure: { findOne: mockFindOne },
}));

// Import AFTER mocks are registered
import handler, {
  config,
  _testOnly_clearBuckets,
  buildSystemPrompt,
} from '../api/chat-stream.js';

// ── Test helpers ──────────────────────────────────────────────────────────
/** Simulate the mongoose query chain: findOne(...).lean() */
function mockQuery(doc) {
  mockFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(doc) });
}

// ── Test fixtures ──────────────────────────────────────────────────────────
const MOCK_PROCEDURE = {
  procedure_code: 'NID',
  name: { en: 'National ID Card', fr: "Carte d'identité nationale" },
  target_office: { en: 'General Directorate of National Security (DGSN)', fr: 'DGSN' },
  official_cost_cfa: 2500,
  estimated_timeline: { en: '2-4 weeks', fr: '2-4 semaines' },
  required_documents: {
    en: ['Original birth certificate', 'Two passport photos'],
    fr: ["Acte de naissance original", 'Deux photos d\'identité'],
  },
  steps: {
    en: [
      { step_number: 1, instruction: 'Visit the nearest DGSN office.' },
      { step_number: 2, instruction: 'Submit your documents.' },
    ],
    fr: [
      { step_number: 1, instruction: 'Visitez le bureau DGSN le plus proche.' },
      { step_number: 2, instruction: 'Déposez vos documents.' },
    ],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(body, { method = 'POST', ip = '1.2.3.4', headers = {} } = {}) {
  return new Request('https://example.com/api/chat-stream', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Async generator that yields text chunks for mocking Gemini's stream. */
async function* textStream(...chunks) {
  for (const text of chunks) yield { text };
}

/** Drain a streaming Response body into a raw string. */
async function collectSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parts = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(decoder.decode(value, { stream: true }));
  }
  return parts.join('');
}

// ── Suite: Edge runtime config ─────────────────────────────────────────────
describe('Edge runtime config', () => {
  it('exports { runtime: "edge" } for Vercel', () => {
    expect(config).toEqual({ runtime: 'edge' });
  });
});

// ── Suite: HTTP method guard ───────────────────────────────────────────────
describe('HTTP method guard', () => {
  it('returns 405 for GET', async () => {
    const res = await handler(makeRequest(undefined, { method: 'GET' }));
    expect(res.status).toBe(405);
  });

  it('returns 405 for PUT', async () => {
    const res = await handler(makeRequest(undefined, { method: 'PUT' }));
    expect(res.status).toBe(405);
  });

  it('returns 405 for DELETE', async () => {
    const res = await handler(makeRequest(undefined, { method: 'DELETE' }));
    expect(res.status).toBe(405);
  });
});

// ── Suite: Input validation ────────────────────────────────────────────────
describe('Input validation', () => {
  beforeEach(() => _testOnly_clearBuckets());

  it('returns 400 for malformed JSON', async () => {
    const req = new Request('https://example.com/api/chat-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: '{ not valid json ]',
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid json/i);
  });

  it('returns 400 when procedure_code is absent', async () => {
    const res = await handler(makeRequest({ message: 'Hello' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('procedure_code');
  });

  it('returns 400 when message is absent', async () => {
    const res = await handler(makeRequest({ procedure_code: 'NID' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('message');
  });

  it('returns 400 when both required fields are absent', async () => {
    const res = await handler(makeRequest({}));
    expect(res.status).toBe(400);
  });
});

// ── Suite: Rate limiter ────────────────────────────────────────────────────
describe('Rate limiter', () => {
  beforeEach(() => {
    _testOnly_clearBuckets();
    mockQuery(MOCK_PROCEDURE);
    mockGenerateContentStream.mockReturnValue(textStream('ok'));
  });

  it('allows exactly 10 requests per IP within the window', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await handler(
        makeRequest({ procedure_code: 'NID', message: 'test' }, { ip: '5.5.5.1' }),
      );
      expect(res.status, `request ${i + 1} should not be rate-limited`).not.toBe(429);
    }
  });

  it('returns 429 on the 11th request from the same IP', async () => {
    for (let i = 0; i < 10; i++) {
      await handler(makeRequest({ procedure_code: 'NID', message: 'test' }, { ip: '5.5.5.2' }));
    }
    const res = await handler(
      makeRequest({ procedure_code: 'NID', message: 'test' }, { ip: '5.5.5.2' }),
    );
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/rate limit/i);
  });

  it('counts requests per IP independently', async () => {
    // Exhaust IP A
    for (let i = 0; i < 10; i++) {
      await handler(makeRequest({ procedure_code: 'NID', message: 'test' }, { ip: '5.5.5.3' }));
    }
    // IP B is unaffected
    const res = await handler(
      makeRequest({ procedure_code: 'NID', message: 'test' }, { ip: '5.5.5.4' }),
    );
    expect(res.status).not.toBe(429);
  });

  it('returns 429 JSON with Content-Type application/json', async () => {
    for (let i = 0; i < 10; i++) {
      await handler(makeRequest({ procedure_code: 'NID', message: 'test' }, { ip: '5.5.5.5' }));
    }
    const res = await handler(
      makeRequest({ procedure_code: 'NID', message: 'test' }, { ip: '5.5.5.5' }),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });
});

// ── Suite: Database lookup ─────────────────────────────────────────────────
describe('Database lookup', () => {
  beforeEach(() => _testOnly_clearBuckets());

  it('returns 404 when the procedure_code is not in the database', async () => {
    mockQuery(null);
    const res = await handler(makeRequest({ procedure_code: 'UNKNOWN_PROC', message: 'test' }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain('UNKNOWN_PROC');
  });

  it('queries by procedure_code', async () => {
    mockQuery(MOCK_PROCEDURE);
    mockGenerateContentStream.mockReturnValue(textStream('ok'));
    await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    expect(mockFindOne).toHaveBeenCalledWith({ procedure_code: 'NID' });
  });
});

// ── Suite: SSE streaming format ────────────────────────────────────────────
describe('SSE streaming format', () => {
  beforeEach(() => {
    _testOnly_clearBuckets();
    mockQuery(MOCK_PROCEDURE);
  });

  it('responds with Content-Type: text/event-stream', async () => {
    mockGenerateContentStream.mockReturnValue(textStream('Hello'));
    const res = await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('sets Cache-Control: no-cache', async () => {
    mockGenerateContentStream.mockReturnValue(textStream('Hello'));
    const res = await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    expect(res.headers.get('Cache-Control')).toBe('no-cache');
  });

  it('sets X-Accel-Buffering: no for nginx proxy compatibility', async () => {
    mockGenerateContentStream.mockReturnValue(textStream('Hello'));
    const res = await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    expect(res.headers.get('X-Accel-Buffering')).toBe('no');
  });

  it('wraps each text chunk as data: {"text":"..."} followed by double newline', async () => {
    mockGenerateContentStream.mockReturnValue(textStream('Hello ', 'world!'));
    const res = await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    const raw = await collectSSE(res);
    expect(raw).toContain('data: {"text":"Hello "}\n\n');
    expect(raw).toContain('data: {"text":"world!"}\n\n');
  });

  it('terminates the stream with data: [DONE]', async () => {
    mockGenerateContentStream.mockReturnValue(textStream('chunk'));
    const res = await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    const raw = await collectSSE(res);
    expect(raw).toContain('data: [DONE]\n\n');
  });

  it('[DONE] is always the last event in the stream', async () => {
    mockGenerateContentStream.mockReturnValue(textStream('a', 'b', 'c'));
    const res = await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    const raw = await collectSSE(res);
    const trimmed = raw.trimEnd();
    expect(trimmed.endsWith('data: [DONE]')).toBe(true);
  });

  it('skips empty string chunks without emitting an SSE event', async () => {
    async function* sparseStream() {
      yield { text: 'real' };
      yield { text: '' };
      yield { text: undefined };
      yield { text: null };
    }
    mockGenerateContentStream.mockReturnValue(sparseStream());
    const res = await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    const raw = await collectSSE(res);

    const events = raw.split('\n\n').filter(Boolean);
    // Only 'real' chunk + [DONE]
    expect(events).toHaveLength(2);
    expect(events[0]).toBe('data: {"text":"real"}');
    expect(events[1]).toBe('data: [DONE]');
  });
});

// ── Suite: Language handling ───────────────────────────────────────────────
describe('Language handling', () => {
  beforeEach(() => {
    _testOnly_clearBuckets();
    mockQuery(MOCK_PROCEDURE);
    mockGenerateContentStream.mockReturnValue(textStream('ok'));
  });

  it('defaults to English when language field is omitted', async () => {
    await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    const { config: cfg } = mockGenerateContentStream.mock.lastCall[0];
    expect(cfg.systemInstruction).toContain('English');
  });

  it('uses English system instruction when language is "en"', async () => {
    await handler(makeRequest({ procedure_code: 'NID', message: 'test', language: 'en' }));
    const { config: cfg } = mockGenerateContentStream.mock.lastCall[0];
    expect(cfg.systemInstruction).toContain('English');
  });

  it('uses French system instruction when language is "fr"', async () => {
    await handler(makeRequest({ procedure_code: 'NID', message: 'test', language: 'fr' }));
    const { config: cfg } = mockGenerateContentStream.mock.lastCall[0];
    expect(cfg.systemInstruction).toContain('French');
  });

  it('falls back to English for an unsupported language code', async () => {
    await handler(makeRequest({ procedure_code: 'NID', message: 'test', language: 'es' }));
    const { config: cfg } = mockGenerateContentStream.mock.lastCall[0];
    expect(cfg.systemInstruction).toContain('English');
  });

  it('injects the French procedure name in French mode', async () => {
    await handler(makeRequest({ procedure_code: 'NID', message: 'test', language: 'fr' }));
    const { config: cfg } = mockGenerateContentStream.mock.lastCall[0];
    expect(cfg.systemInstruction).toContain("Carte d'identité nationale");
  });
});

// ── Suite: Gemini error handling ───────────────────────────────────────────
describe('Gemini error handling', () => {
  beforeEach(() => {
    _testOnly_clearBuckets();
    mockQuery(MOCK_PROCEDURE);
  });

  it('emits an error event then [DONE] when Gemini throws mid-stream', async () => {
    async function* failMidStream() {
      yield { text: 'partial answer' };
      throw new Error('Gemini quota exceeded');
    }
    mockGenerateContentStream.mockReturnValue(failMidStream());

    const res = await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    const raw = await collectSSE(res);

    expect(raw).toContain('"error":"Gemini quota exceeded"');
    expect(raw).toContain('data: [DONE]\n\n');
  });

  it('still delivers [DONE] when Gemini rejects before any chunk', async () => {
    async function* eagerFail() {
      throw new Error('Network timeout');
      // eslint-disable-next-line no-unreachable
      yield;
    }
    mockGenerateContentStream.mockReturnValue(eagerFail());

    const res = await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    const raw = await collectSSE(res);

    expect(raw).toContain('"error":"Network timeout"');
    expect(raw).toContain('data: [DONE]\n\n');
  });

  it('responds with 200 and SSE headers even when Gemini fails', async () => {
    async function* fail() { throw new Error('API key invalid'); yield; }
    mockGenerateContentStream.mockReturnValue(fail());

    const res = await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });
});

// ── Suite: System prompt guardrails ───────────────────────────────────────
describe('System prompt RAG guardrails', () => {
  beforeEach(() => {
    _testOnly_clearBuckets();
    mockQuery(MOCK_PROCEDURE);
    mockGenerateContentStream.mockReturnValue(textStream('response'));
  });

  it('injects the procedure document into systemInstruction', async () => {
    await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    const { config: cfg } = mockGenerateContentStream.mock.lastCall[0];
    expect(cfg.systemInstruction).toContain('National ID Card');
    expect(cfg.systemInstruction).toContain('2500');
  });

  it('includes a ground-truth-only rule in the system prompt', async () => {
    await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    const { config: cfg } = mockGenerateContentStream.mock.lastCall[0];
    expect(cfg.systemInstruction).toMatch(/ground truth only|answer exclusively/i);
  });

  it('includes an off-topic redirect mentioning the dropdown', async () => {
    await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    const { config: cfg } = mockGenerateContentStream.mock.lastCall[0];
    expect(cfg.systemInstruction).toContain('dropdown');
  });

  it('includes a no-hallucination rule', async () => {
    await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    const { config: cfg } = mockGenerateContentStream.mock.lastCall[0];
    expect(cfg.systemInstruction).toMatch(/no hallucination|never guess/i);
  });

  it('places the user message in the user-role contents array', async () => {
    await handler(
      makeRequest({ procedure_code: 'NID', message: 'What documents do I need?' }),
    );
    const { contents } = mockGenerateContentStream.mock.lastCall[0];
    expect(contents[0].role).toBe('user');
    expect(contents[0].parts[0].text).toBe('What documents do I need?');
  });

  it('calls gemini-1.5-flash model', async () => {
    await handler(makeRequest({ procedure_code: 'NID', message: 'test' }));
    const { model } = mockGenerateContentStream.mock.lastCall[0];
    expect(model).toBe('gemini-1.5-flash');
  });
});

// ── Suite: buildSystemPrompt unit tests ───────────────────────────────────
describe('buildSystemPrompt', () => {
  it('includes the English procedure name for en', () => {
    const prompt = buildSystemPrompt(MOCK_PROCEDURE, 'en');
    expect(prompt).toContain('National ID Card');
    expect(prompt).not.toContain("Carte d'identité nationale");
  });

  it('includes the French procedure name for fr', () => {
    const prompt = buildSystemPrompt(MOCK_PROCEDURE, 'fr');
    expect(prompt).toContain("Carte d'identité nationale");
    expect(prompt).not.toContain('National ID Card');
  });

  it('does not leak the opposite language steps into the prompt', () => {
    const enPrompt = buildSystemPrompt(MOCK_PROCEDURE, 'en');
    expect(enPrompt).toContain('Visit the nearest DGSN office');
    expect(enPrompt).not.toContain('Visitez le bureau DGSN');
  });

  it('serializes official_cost_cfa regardless of language', () => {
    const enPrompt = buildSystemPrompt(MOCK_PROCEDURE, 'en');
    const frPrompt = buildSystemPrompt(MOCK_PROCEDURE, 'fr');
    expect(enPrompt).toContain('2500');
    expect(frPrompt).toContain('2500');
  });

  it('defaults to English when an unknown locale is passed', () => {
    const prompt = buildSystemPrompt(MOCK_PROCEDURE, 'de');
    expect(prompt).toContain('English');
  });
});
