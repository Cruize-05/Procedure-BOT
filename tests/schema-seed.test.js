/**
 * Schema and seed integration tests.
 * Boots an in-memory MongoDB instance, runs the seed pipeline, and
 * verifies bilingual field isolation with no cross-language contamination.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Procedure } from '../backend/shared/schema.js';
import { procedures, seedDatabase } from '../backend/scripts/seed.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await seedDatabase();
}, 600000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ── Collection-level assertions ───────────────────────────────────────────────

describe('seed pipeline', () => {
  it('populates exactly 10 procedures', async () => {
    const count = await Procedure.countDocuments();
    expect(count).toBe(10);
  });

  it('each procedure_code is unique', async () => {
    const docs = await Procedure.find().select('procedure_code').lean();
    const codes = docs.map((d) => d.procedure_code);
    expect(new Set(codes).size).toBe(10);
  });

  it('inserts all expected procedure codes', async () => {
    const expected = [
      'NATIONAL_ID', 'BIRTH_CERT', 'BUSINESS_REG', 'MARRIAGE_CERT', 'PASSPORT',
      'DRIVERS_LICENSE', 'LAND_TITLE', 'CRIMINAL_RECORD', 'DEATH_CERT', 'SCHOOL_CERT_AUTH',
    ];
    const docs = await Procedure.find().select('procedure_code').lean();
    const codes = docs.map((d) => d.procedure_code);
    for (const code of expected) {
      expect(codes).toContain(code);
    }
  });

  it('is idempotent — re-running seed does not duplicate documents', async () => {
    await seedDatabase();
    const count = await Procedure.countDocuments();
    expect(count).toBe(10);
  });
});

// ── Schema field structure ────────────────────────────────────────────────────

describe('schema field types', () => {
  let doc;

  beforeAll(async () => {
    doc = await Procedure.findOne({ procedure_code: 'NATIONAL_ID' }).lean();
  });

  it('procedure_code is stored uppercased', () => {
    expect(doc.procedure_code).toBe('NATIONAL_ID');
  });

  it('name contains required en and fr string fields', () => {
    expect(typeof doc.name.en).toBe('string');
    expect(typeof doc.name.fr).toBe('string');
    expect(doc.name.en.length).toBeGreaterThan(0);
    expect(doc.name.fr.length).toBeGreaterThan(0);
  });

  it('target_office contains required en and fr string fields', () => {
    expect(typeof doc.target_office.en).toBe('string');
    expect(typeof doc.target_office.fr).toBe('string');
  });

  it('official_cost_cfa is a number', () => {
    expect(typeof doc.official_cost_cfa).toBe('number');
  });

  it('estimated_timeline contains required en and fr string fields', () => {
    expect(typeof doc.estimated_timeline.en).toBe('string');
    expect(typeof doc.estimated_timeline.fr).toBe('string');
  });

  it('required_documents.en and required_documents.fr are arrays of strings', () => {
    expect(Array.isArray(doc.required_documents.en)).toBe(true);
    expect(Array.isArray(doc.required_documents.fr)).toBe(true);
    expect(doc.required_documents.en.length).toBeGreaterThan(0);
    expect(doc.required_documents.fr.length).toBeGreaterThan(0);
    for (const item of doc.required_documents.en) {
      expect(typeof item).toBe('string');
    }
    for (const item of doc.required_documents.fr) {
      expect(typeof item).toBe('string');
    }
  });

  it('steps.en and steps.fr are arrays with step_number and instruction', () => {
    for (const lang of ['en', 'fr']) {
      expect(Array.isArray(doc.steps[lang])).toBe(true);
      expect(doc.steps[lang].length).toBeGreaterThan(0);
      for (const step of doc.steps[lang]) {
        expect(typeof step.step_number).toBe('number');
        expect(typeof step.instruction).toBe('string');
        expect(step.instruction.length).toBeGreaterThan(0);
      }
    }
  });

  it('steps are sequentially numbered starting at 1', () => {
    for (const lang of ['en', 'fr']) {
      doc.steps[lang].forEach((step, idx) => {
        expect(step.step_number).toBe(idx + 1);
      });
    }
  });

  it('official_cost_cfa defaults to 0 for free procedures', async () => {
    const birthCert = await Procedure.findOne({ procedure_code: 'BIRTH_CERT' }).lean();
    expect(birthCert.official_cost_cfa).toBe(0);
    const deathCert = await Procedure.findOne({ procedure_code: 'DEATH_CERT' }).lean();
    expect(deathCert.official_cost_cfa).toBe(0);
  });
});

// ── Bilingual isolation — no cross-language contamination ─────────────────────

describe('bilingual field isolation', () => {
  it('name.en and name.fr are different strings for all procedures', async () => {
    const docs = await Procedure.find().lean();
    for (const doc of docs) {
      expect(doc.name.en).not.toBe(doc.name.fr);
    }
  });

  it('estimated_timeline.en and estimated_timeline.fr are different strings', async () => {
    const docs = await Procedure.find().lean();
    for (const doc of docs) {
      expect(doc.estimated_timeline.en).not.toBe(doc.estimated_timeline.fr);
    }
  });

  it('steps.en instructions do not appear verbatim in steps.fr', async () => {
    const docs = await Procedure.find().lean();
    for (const doc of docs) {
      const enInstructions = new Set(doc.steps.en.map((s) => s.instruction));
      for (const frStep of doc.steps.fr) {
        expect(enInstructions.has(frStep.instruction)).toBe(false);
      }
    }
  });

  it('required_documents.en items do not appear verbatim in required_documents.fr', async () => {
    const docs = await Procedure.find().lean();
    for (const doc of docs) {
      const enDocs = new Set(doc.required_documents.en);
      for (const frDoc of doc.required_documents.fr) {
        expect(enDocs.has(frDoc)).toBe(false);
      }
    }
  });

  it('en and fr steps arrays have the same count per procedure', async () => {
    const docs = await Procedure.find().lean();
    for (const doc of docs) {
      expect(doc.steps.en.length).toBe(doc.steps.fr.length);
    }
  });

  it('en and fr required_documents arrays have the same count per procedure', async () => {
    const docs = await Procedure.find().lean();
    for (const doc of docs) {
      expect(doc.required_documents.en.length).toBe(doc.required_documents.fr.length);
    }
  });
});

// ── Selective retrieval — language-scoped projection ─────────────────────────

describe('language-scoped projection', () => {
  it('fetching only English fields does not include French content', async () => {
    const doc = await Procedure
      .findOne({ procedure_code: 'PASSPORT' })
      .select('name.en steps.en required_documents.en')
      .lean();

    expect(doc.name.en).toBeTruthy();
    expect(doc.name.fr).toBeUndefined();
    expect(doc.steps.en).toBeDefined();
    expect(doc.steps.fr).toBeUndefined();
  });

  it('fetching only French fields does not include English content', async () => {
    const doc = await Procedure
      .findOne({ procedure_code: 'PASSPORT' })
      .select('name.fr steps.fr required_documents.fr')
      .lean();

    expect(doc.name.fr).toBeTruthy();
    expect(doc.name.en).toBeUndefined();
    expect(doc.steps.fr).toBeDefined();
    expect(doc.steps.en).toBeUndefined();
  });

  it('procedure_code lookup returns the correct procedure', async () => {
    const doc = await Procedure.findOne({ procedure_code: 'CRIMINAL_RECORD' }).lean();
    expect(doc.procedure_code).toBe('CRIMINAL_RECORD');
    expect(doc.name.en).toContain('Criminal');
    expect(doc.name.fr).toContain('Casier');
  });
});

// ── Source data consistency ───────────────────────────────────────────────────

describe('procedures source array', () => {
  it('exports exactly 10 procedure objects', () => {
    expect(procedures).toHaveLength(10);
  });

  it('every procedure has all required fields', () => {
    const requiredFields = [
      'procedure_code', 'name', 'target_office',
      'official_cost_cfa', 'estimated_timeline',
      'required_documents', 'steps',
    ];
    for (const proc of procedures) {
      for (const field of requiredFields) {
        expect(proc, `${proc.procedure_code} missing ${field}`).toHaveProperty(field);
      }
    }
  });

  it('every procedure has both en and fr for bilingual fields', () => {
    const bilingualFields = ['name', 'target_office', 'estimated_timeline', 'required_documents', 'steps'];
    for (const proc of procedures) {
      for (const field of bilingualFields) {
        expect(proc[field], `${proc.procedure_code}.${field} missing en`).toHaveProperty('en');
        expect(proc[field], `${proc.procedure_code}.${field} missing fr`).toHaveProperty('fr');
      }
    }
  });
});
