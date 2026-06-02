/**
 * Unit tests for /backend/api/export-checklist.js
 *
 * Strategy:
 *  - PDFDocument is fully mocked — no real PDF bytes generated.
 *  - The mock triggers 'data' + 'end' synchronously inside doc.end()
 *    so the Promise in the handler resolves without a real stream.
 *  - validateBody and LABELS are imported directly for unit-level coverage.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mock: PDFDocument ─────────────────────────────────────────────
const MockPDFDocument = vi.hoisted(() => {
  return vi.fn().mockImplementation(() => {
    const handlers = {};
    const instance = {
      on: vi.fn((event, cb) => {
        handlers[event] = cb;
        return instance;
      }),
      end: vi.fn(() => {
        // Emit a fake PDF header chunk then fire 'end'
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

import handler, { validateBody, LABELS } from '../api/export-checklist.js';

// ── Helpers ───────────────────────────────────────────────────────────────
function makeRes() {
  const res = {
    _status: 200,
    _headers: {},
    _body: null,
    status: vi.fn().mockImplementation((code) => {
      res._status = code;
      return res;
    }),
    setHeader: vi.fn().mockImplementation((k, v) => {
      res._headers[k] = v;
    }),
    json: vi.fn().mockImplementation((body) => {
      res._body = body;
      return res;
    }),
    send: vi.fn().mockImplementation((body) => {
      res._body = body;
      return res;
    }),
  };
  return res;
}

function makeReq(body, method = 'POST') {
  return { method, body };
}

const VALID_PROCEDURE_EN = {
  language: 'en',
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
    fr: ['Acte de naissance original', 'Deux photos d\'identité', 'Justificatif de domicile'],
  },
  steps: {
    en: [
      { step_number: 1, instruction: 'Visit the nearest DGSN office.' },
      { step_number: 2, instruction: 'Submit your documents to the officer.' },
    ],
    fr: [
      { step_number: 1, instruction: 'Visitez le bureau DGSN le plus proche.' },
      { step_number: 2, instruction: 'Déposez vos documents auprès de l\'agent.' },
    ],
  },
};

const VALID_PROCEDURE_FR = { ...VALID_PROCEDURE_EN, language: 'fr' };

// ── Suite: HTTP method guard ──────────────────────────────────────────────
describe('HTTP method guard', () => {
  it('returns 405 for GET', async () => {
    const res = makeRes();
    await handler(makeReq(null, 'GET'), res);
    expect(res._status).toBe(405);
    expect(res._body).toMatchObject({ error: 'Method Not Allowed' });
  });

  it('returns 405 for PUT', async () => {
    const res = makeRes();
    await handler(makeReq(null, 'PUT'), res);
    expect(res._status).toBe(405);
  });

  it('returns 405 for DELETE', async () => {
    const res = makeRes();
    await handler(makeReq(null, 'DELETE'), res);
    expect(res._status).toBe(405);
  });

  it('returns 405 for PATCH', async () => {
    const res = makeRes();
    await handler(makeReq(null, 'PATCH'), res);
    expect(res._status).toBe(405);
  });
});

// ── Suite: Input validation — 400 error paths ─────────────────────────────
describe('Input validation — 400 errors', () => {
  it('returns 400 when body is empty', async () => {
    const res = makeRes();
    await handler(makeReq({}), res);
    expect(res._status).toBe(400);
  });

  it('returns 400 when procedure_code is missing', async () => {
    const { procedure_code: _, ...body } = VALID_PROCEDURE_EN;
    const res = makeRes();
    await handler(makeReq(body), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('procedure_code');
  });

  it('returns 400 when name field is missing', async () => {
    const { name: _, ...body } = VALID_PROCEDURE_EN;
    const res = makeRes();
    await handler(makeReq(body), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('name.en');
  });

  it('returns 400 when name.en is missing for English request', async () => {
    const body = { ...VALID_PROCEDURE_EN, name: { fr: "Carte d'identité" } };
    const res = makeRes();
    await handler(makeReq(body), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('name.en');
  });

  it('returns 400 when name.fr is missing for French request', async () => {
    const body = { ...VALID_PROCEDURE_FR, name: { en: 'National ID Card' } };
    const res = makeRes();
    await handler(makeReq(body), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('name.fr');
  });

  it('returns 400 when official_cost_cfa is missing', async () => {
    const { official_cost_cfa: _, ...body } = VALID_PROCEDURE_EN;
    const res = makeRes();
    await handler(makeReq(body), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('official_cost_cfa');
  });

  it('returns 400 when estimated_timeline is missing', async () => {
    const { estimated_timeline: _, ...body } = VALID_PROCEDURE_EN;
    const res = makeRes();
    await handler(makeReq(body), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('estimated_timeline.en');
  });

  it('returns 400 when required_documents is missing', async () => {
    const { required_documents: _, ...body } = VALID_PROCEDURE_EN;
    const res = makeRes();
    await handler(makeReq(body), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('required_documents.en');
  });

  it('returns 400 when required_documents.en is not an array', async () => {
    const body = {
      ...VALID_PROCEDURE_EN,
      required_documents: { en: 'not-an-array', fr: [] },
    };
    const res = makeRes();
    await handler(makeReq(body), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('required_documents.en');
  });

  it('returns 400 when steps is missing', async () => {
    const { steps: _, ...body } = VALID_PROCEDURE_EN;
    const res = makeRes();
    await handler(makeReq(body), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('steps.en');
  });

  it('returns 400 when steps.en is not an array', async () => {
    const body = { ...VALID_PROCEDURE_EN, steps: { en: 'not-an-array', fr: [] } };
    const res = makeRes();
    await handler(makeReq(body), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('steps.en');
  });

  it('returns 400 when target_office is missing', async () => {
    const { target_office: _, ...body } = VALID_PROCEDURE_EN;
    const res = makeRes();
    await handler(makeReq(body), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('target_office.en');
  });

  it('does not throw on null body (treated as empty object)', async () => {
    const res = makeRes();
    await expect(handler(makeReq(null), res)).resolves.not.toThrow();
    expect(res._status).toBe(400);
  });
});

// ── Suite: Valid request — response shape ─────────────────────────────────
describe('Valid request — response shape', () => {
  beforeEach(() => {
    MockPDFDocument.mockClear();
  });

  it('sends Content-Type: application/pdf', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_EN), res);
    expect(res._headers['Content-Type']).toBe('application/pdf');
  });

  it('sends Content-Disposition: attachment; filename=checklist.pdf', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_EN), res);
    expect(res._headers['Content-Disposition']).toBe('attachment; filename=checklist.pdf');
  });

  it('sets Content-Length header to buffer byte count', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_EN), res);
    expect(typeof res._headers['Content-Length']).toBe('number');
    expect(res._headers['Content-Length']).toBeGreaterThan(0);
  });

  it('calls res.send() with a Buffer', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_EN), res);
    expect(Buffer.isBuffer(res._body)).toBe(true);
  });

  it('buffer starts with PDF magic bytes %PDF', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_EN), res);
    expect(res._body.slice(0, 4).toString()).toBe('%PDF');
  });

  it('does not call res.status() for a successful request (defaults to 200)', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_EN), res);
    // status() is only called for error paths
    expect(res.status).not.toHaveBeenCalled();
  });

  it('does not hang — resolves within test timeout', async () => {
    const res = makeRes();
    await expect(
      Promise.race([
        handler(makeReq(VALID_PROCEDURE_EN), res),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]),
    ).resolves.not.toThrow();
  });
});

// ── Suite: Language handling ──────────────────────────────────────────────
describe('Language handling', () => {
  beforeEach(() => MockPDFDocument.mockClear());

  it('defaults to English when language field is omitted', async () => {
    const { language: _, ...body } = VALID_PROCEDURE_EN;
    const res = makeRes();
    await handler(makeReq(body), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(allTextCalls.some((a) => String(a).includes('National ID Card'))).toBe(true);
  });

  it('uses English labels when language="en"', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_EN), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(allTextCalls.some((a) => String(a).includes('OFFICIAL COST'))).toBe(true);
    expect(allTextCalls.some((a) => String(a).includes('Required Documents'))).toBe(true);
  });

  it('uses French labels when language="fr"', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_FR), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(allTextCalls.some((a) => String(a).includes('COÛT OFFICIEL'))).toBe(true);
    expect(allTextCalls.some((a) => String(a).includes('Documents Requis'))).toBe(true);
  });

  it('falls back to English for an unsupported language code', async () => {
    const body = { ...VALID_PROCEDURE_EN, language: 'es' };
    const res = makeRes();
    await handler(makeReq(body), res);
    // Should succeed (no 400) and use English content
    expect(res._headers['Content-Type']).toBe('application/pdf');
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(allTextCalls.some((a) => String(a).includes('OFFICIAL COST'))).toBe(true);
  });

  it('renders the French procedure name in French mode', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_FR), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(allTextCalls.some((a) => String(a).includes("Carte d'identité nationale"))).toBe(true);
  });

  it('renders the English procedure name in English mode', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_EN), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(allTextCalls.some((a) => String(a).includes('National ID Card'))).toBe(true);
  });
});

// ── Suite: PDF content rendering ──────────────────────────────────────────
describe('PDF content rendering', () => {
  beforeEach(() => MockPDFDocument.mockClear());

  it('renders each required document as a checkbox item', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_EN), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(
      allTextCalls.some((a) => String(a).includes('Original birth certificate')),
    ).toBe(true);
    expect(
      allTextCalls.some((a) => String(a).includes('Two passport photos')),
    ).toBe(true);
  });

  it('renders the official cost in CFA', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_EN), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(allTextCalls.some((a) => String(a).includes('CFA'))).toBe(true);
  });

  it('renders the estimated timeline', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_EN), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(allTextCalls.some((a) => String(a).includes('2-4 weeks'))).toBe(true);
  });

  it('renders step instructions', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_EN), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(
      allTextCalls.some((a) => String(a).includes('Visit the nearest DGSN office.')),
    ).toBe(true);
  });

  it('renders the target office in the header', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_EN), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(
      allTextCalls.some((a) => String(a).includes('General Directorate of National Security')),
    ).toBe(true);
  });

  it('uses French required documents in French mode', async () => {
    const res = makeRes();
    await handler(makeReq(VALID_PROCEDURE_FR), res);
    const docInstance = MockPDFDocument.mock.results[0].value;
    const allTextCalls = docInstance.text.mock.calls.flat();
    expect(
      allTextCalls.some((a) => String(a).includes('Acte de naissance original')),
    ).toBe(true);
  });
});

// ── Suite: validateBody unit tests ────────────────────────────────────────
describe('validateBody', () => {
  it('returns { lang: "en" } for a valid English payload', () => {
    expect(validateBody(VALID_PROCEDURE_EN)).toEqual({ lang: 'en' });
  });

  it('returns { lang: "fr" } for a valid French payload', () => {
    expect(validateBody(VALID_PROCEDURE_FR)).toEqual({ lang: 'fr' });
  });

  it('defaults to "en" when language is absent', () => {
    const { language: _, ...body } = VALID_PROCEDURE_EN;
    expect(validateBody(body)).toEqual({ lang: 'en' });
  });

  it('defaults to "en" for an unsupported locale', () => {
    expect(validateBody({ ...VALID_PROCEDURE_EN, language: 'de' })).toEqual({ lang: 'en' });
  });

  it('returns error object when procedure_code is absent', () => {
    const { procedure_code: _, ...body } = VALID_PROCEDURE_EN;
    const result = validateBody(body);
    expect(result).toHaveProperty('error');
    expect(result.error).toContain('procedure_code');
  });

  it('returns error object for empty body', () => {
    const result = validateBody({});
    expect(result).toHaveProperty('error');
  });
});

// ── Suite: LABELS export ──────────────────────────────────────────────────
describe('LABELS constants', () => {
  it('exports English and French label sets', () => {
    expect(LABELS).toHaveProperty('en');
    expect(LABELS).toHaveProperty('fr');
  });

  it('English officialCost label is "OFFICIAL COST"', () => {
    expect(LABELS.en.officialCost).toBe('OFFICIAL COST');
  });

  it('French officialCost label is "COÛT OFFICIEL"', () => {
    expect(LABELS.fr.officialCost).toBe('COÛT OFFICIEL');
  });

  it('English footer function includes date string', () => {
    const text = LABELS.en.footer('6/1/2026');
    expect(text).toContain('6/1/2026');
    expect(text).toContain('ProcedureBot CM');
  });

  it('French footer function includes date string', () => {
    const text = LABELS.fr.footer('01/06/2026');
    expect(text).toContain('01/06/2026');
    expect(text).toContain('ProcedureBot CM');
  });
});
