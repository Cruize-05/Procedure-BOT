/**
 * Integration tests for the MongoDB lookup path in /backend/api/export-checklist.js
 *
 * These tests cover the "simple mode" introduced in Phase 6 where the frontend
 * sends only { procedure_code, language } and the handler fetches the full
 * document from MongoDB before generating the PDF.
 *
 * Strategy:
 *  - mongoose and Procedure are mocked identically to chat-stream.test.js.
 *  - PDFDocument is mocked to avoid real PDF generation.
 *  - The existing full-body validation path is NOT retested here — those tests
 *    live in export-checklist.test.js.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mock: PDFDocument ──────────────────────────────────────────────
const MockPDFDocument = vi.hoisted(() => {
  return vi.fn().mockImplementation(() => {
    const handlers = {};
    const instance = {
      on: vi.fn((event, cb) => { handlers[event] = cb; return instance; }),
      end: vi.fn(() => {
        handlers.data?.(Buffer.from('%PDF-1.4 fake-pdf-content'));
        handlers.end?.();
        return instance;
      }),
      fontSize: vi.fn().mockReturnThis(),
      font: vi.fn().mockReturnThis(),
      text: vi.fn().mockReturnThis(),
      moveDown: vi.fn().mockReturnThis(),
      rect: vi.fn().mockReturnThis(),
      fill: vi.fn().mockReturnThis(),
      stroke: vi.fn().mockReturnThis(),
      strokeColor: vi.fn().mockReturnThis(),
      moveTo: vi.fn().mockReturnThis(),
      lineTo: vi.fn().mockReturnThis(),
      fillColor: vi.fn().mockReturnThis(),
      page: { width: 595.28 },
      y: 114,
    };
    return instance;
  });
});

vi.mock('pdfkit', () => ({ default: MockPDFDocument }));

// ── Hoisted mocks: mongoose + Procedure ───────────────────────────────────
const mockFindOne = vi.hoisted(() => vi.fn());

vi.mock('mongoose', () => ({
  default: {
    connection: { readyState: 1 },
    connect: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../backend/shared/schema.js', () => ({
  Procedure: { findOne: mockFindOne },
}));

import handler from '../backend/api/export-checklist.js';

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRes() {
  const res = {
    _status: 200,
    _headers: {},
    _body: null,
    status: vi.fn().mockImplementation((code) => { res._status = code; return res; }),
    setHeader: vi.fn().mockImplementation((k, v) => { res._headers[k] = v; }),
    json: vi.fn().mockImplementation((body) => { res._body = body; return res; }),
    send: vi.fn().mockImplementation((body) => { res._body = body; return res; }),
  };
  return res;
}

function makeReq(body, method = 'POST') {
  return { method, body };
}

function mockQuery(doc) {
  mockFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(doc) });
}

// ── MongoDB procedure document fixture ────────────────────────────────────
const MONGO_PROCEDURE = {
  procedure_code: 'NID',
  name: { en: 'National ID Card', fr: "Carte d'identité nationale" },
  target_office: {
    en: 'General Directorate of National Security (DGSN)',
    fr: 'Direction Générale de la Sûreté Nationale',
  },
  official_cost_cfa: 2500,
  estimated_timeline: { en: '2-4 weeks', fr: '2-4 semaines' },
  required_documents: {
    en: ['Original birth certificate', 'Two passport photos', 'Proof of residence'],
    fr: ["Acte de naissance original", "Deux photos d'identité", 'Justificatif de domicile'],
  },
  steps: {
    en: [
      { step_number: 1, instruction: 'Visit the nearest DGSN office.' },
      { step_number: 2, instruction: 'Submit your documents to the officer.' },
    ],
    fr: [
      { step_number: 1, instruction: 'Visitez le bureau DGSN le plus proche.' },
      { step_number: 2, instruction: "Déposez vos documents auprès de l'agent." },
    ],
  },
};

// ── Suite: Simple lookup mode detection ───────────────────────────────────
describe('Simple lookup mode — { procedure_code, language } only', () => {
  beforeEach(() => MockPDFDocument.mockClear());

  it('enters lookup mode when name and target_office are absent', async () => {
    mockQuery(MONGO_PROCEDURE);
    const res = makeRes();
    await handler(makeReq({ procedure_code: 'NID', language: 'en' }), res);
    expect(mockFindOne).toHaveBeenCalledWith({ procedure_code: 'NID' });
  });

  it('does NOT enter lookup mode when full document fields are provided', async () => {
    // Full-data path — mockFindOne should never be called
    mockFindOne.mockClear();
    const res = makeRes();
    await handler(
      makeReq({
        procedure_code: 'NID',
        language: 'en',
        name: { en: 'National ID Card', fr: "Carte d'identité" },
        target_office: { en: 'DGSN', fr: 'DGSN' },
        official_cost_cfa: 2500,
        estimated_timeline: { en: '2-4 weeks', fr: '2-4 semaines' },
        required_documents: { en: ['Birth certificate'], fr: ['Acte de naissance'] },
        steps: {
          en: [{ step_number: 1, instruction: 'Go.' }],
          fr: [{ step_number: 1, instruction: 'Allez.' }],
        },
      }),
      res
    );
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(res._headers['Content-Type']).toBe('application/pdf');
  });
});

// ── Suite: 404 when procedure not found ───────────────────────────────────
describe('Simple lookup mode — 404 response', () => {
  it('returns 404 when MongoDB returns null for the procedure_code', async () => {
    mockQuery(null);
    const res = makeRes();
    await handler(makeReq({ procedure_code: 'UNKNOWN', language: 'en' }), res);
    expect(res._status).toBe(404);
    expect(res._body.error).toContain('UNKNOWN');
  });

  it('404 response body includes the unknown procedure code', async () => {
    mockQuery(null);
    const res = makeRes();
    await handler(makeReq({ procedure_code: 'GHOST_CODE', language: 'fr' }), res);
    expect(res._body.error).toContain('GHOST_CODE');
  });
});

// ── Suite: 503 when MongoDB throws ────────────────────────────────────────
describe('Simple lookup mode — 503 on DB error', () => {
  it('returns 503 when mongoose.connect throws', async () => {
    mockFindOne.mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('Connection timed out')),
    });

    const res = makeRes();
    await handler(makeReq({ procedure_code: 'NID', language: 'en' }), res);
    expect(res._status).toBe(503);
    expect(res._body.error).toMatch(/database/i);
  });
});

// ── Suite: Successful PDF generation via lookup ──────────────────────────
describe('Simple lookup mode — successful PDF generation', () => {
  beforeEach(() => {
    MockPDFDocument.mockClear();
    mockQuery(MONGO_PROCEDURE);
  });

  it('returns Content-Type: application/pdf', async () => {
    const res = makeRes();
    await handler(makeReq({ procedure_code: 'NID', language: 'en' }), res);
    expect(res._headers['Content-Type']).toBe('application/pdf');
  });

  it('returns Content-Disposition: attachment; filename=checklist.pdf', async () => {
    const res = makeRes();
    await handler(makeReq({ procedure_code: 'NID', language: 'en' }), res);
    expect(res._headers['Content-Disposition']).toBe('attachment; filename=checklist.pdf');
  });

  it('sends a Buffer body that starts with %PDF', async () => {
    const res = makeRes();
    await handler(makeReq({ procedure_code: 'NID', language: 'en' }), res);
    expect(Buffer.isBuffer(res._body)).toBe(true);
    expect(res._body.slice(0, 4).toString()).toBe('%PDF');
  });

  it('uses English procedure data when language is "en"', async () => {
    const res = makeRes();
    await handler(makeReq({ procedure_code: 'NID', language: 'en' }), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(allTextCalls.some((a) => String(a).includes('National ID Card'))).toBe(true);
    expect(allTextCalls.some((a) => String(a).includes('OFFICIAL COST'))).toBe(true);
  });

  it('uses French procedure data when language is "fr"', async () => {
    const res = makeRes();
    await handler(makeReq({ procedure_code: 'NID', language: 'fr' }), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(allTextCalls.some((a) => String(a).includes("Carte d'identité nationale"))).toBe(true);
    expect(allTextCalls.some((a) => String(a).includes('COÛT OFFICIEL'))).toBe(true);
  });

  it('defaults to English when language field is omitted', async () => {
    const res = makeRes();
    await handler(makeReq({ procedure_code: 'NID' }), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(allTextCalls.some((a) => String(a).includes('National ID Card'))).toBe(true);
  });

  it('renders required documents from MongoDB data', async () => {
    const res = makeRes();
    await handler(makeReq({ procedure_code: 'NID', language: 'en' }), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(allTextCalls.some((a) => String(a).includes('Original birth certificate'))).toBe(true);
  });

  it('renders step instructions from MongoDB data', async () => {
    const res = makeRes();
    await handler(makeReq({ procedure_code: 'NID', language: 'en' }), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(allTextCalls.some((a) => String(a).includes('Visit the nearest DGSN office'))).toBe(true);
  });
});

// ── Suite: Method guard still works in lookup mode ─────────────────────────
describe('HTTP method guard', () => {
  it('returns 405 for GET in lookup mode', async () => {
    const res = makeRes();
    await handler(makeReq({ procedure_code: 'NID', language: 'en' }, 'GET'), res);
    expect(res._status).toBe(405);
  });
});
