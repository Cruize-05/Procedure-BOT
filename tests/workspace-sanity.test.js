/**
 * Workspace structure sanity tests.
 * Verifies that all required files exist before the pipeline proceeds to later
 * stages. Updated for the deployment-ready flat structure (api/, lib/, scripts/).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function abs(...parts) {
  return join(ROOT, ...parts);
}

function readJSON(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

// ── Required file/directory manifest ─────────────────────────────────────────
const REQUIRED_PATHS = [
  // Root config
  'package.json',
  '.env.example',
  '.gitlab-ci.yml',
  'vitest.config.js',
  'vercel.json',
  // API functions (Vercel standard /api directory)
  'api/chat-stream.js',
  'api/export-checklist.js',
  // Shared backend library
  'lib/schema.js',
  // DB seed script
  'scripts/seed.js',
  // Frontend SPA
  'frontend/package.json',
  'frontend/vite.config.js',
  'frontend/index.html',
  'frontend/tailwind.config.js',
  'frontend/postcss.config.js',
  'frontend/src/main.jsx',
  'frontend/src/App.jsx',
  'frontend/src/index.css',
];

describe('Workspace file structure', () => {
  it.each(REQUIRED_PATHS)('exists: %s', (relativePath) => {
    expect(existsSync(abs(relativePath)), `Missing: ${relativePath}`).toBe(true);
  });
});

// ── Root package.json validation ──────────────────────────────────────────────
describe('Root package.json', () => {
  const pkg = readJSON(abs('package.json'));

  it('is valid JSON', () => {
    expect(pkg).not.toBeNull();
  });

  it('declares frontend workspace', () => {
    expect(Array.isArray(pkg?.workspaces)).toBe(true);
    expect(pkg.workspaces).toContain('frontend');
  });

  it('declares production dependencies for API functions', () => {
    const deps = pkg?.dependencies ?? {};
    expect(deps).toHaveProperty('@google/genai');
    expect(deps).toHaveProperty('mongoose');
    expect(deps).toHaveProperty('pdfkit');
  });

  it('has required npm scripts', () => {
    const scripts = pkg?.scripts ?? {};
    const required = ['dev', 'build', 'test', 'lint', 'seed'];
    for (const script of required) {
      expect(scripts, `Missing script: ${script}`).toHaveProperty(script);
    }
  });

  it('enforces Node.js >= 18 engine', () => {
    expect(pkg?.engines?.node).toMatch(/^>=18/);
  });
});

// ── .env.example validation ───────────────────────────────────────────────────
describe('.env.example', () => {
  const envContent = existsSync(abs('.env.example'))
    ? readFileSync(abs('.env.example'), 'utf8')
    : '';

  it('declares GEMINI_API_KEY', () => {
    expect(envContent).toContain('GEMINI_API_KEY');
  });

  it('declares MONGODB_URI', () => {
    expect(envContent).toContain('MONGODB_URI');
  });

  it('declares NODE_ENV', () => {
    expect(envContent).toContain('NODE_ENV');
  });
});

// ── .gitlab-ci.yml validation ─────────────────────────────────────────────────
describe('.gitlab-ci.yml', () => {
  const ciContent = existsSync(abs('.gitlab-ci.yml'))
    ? readFileSync(abs('.gitlab-ci.yml'), 'utf8')
    : '';

  it('defines a lint stage', () => {
    expect(ciContent).toMatch(/^\s*-\s*lint/m);
  });

  it('defines a security stage', () => {
    expect(ciContent).toMatch(/^\s*-\s*security/m);
  });

  it('defines a build stage', () => {
    expect(ciContent).toMatch(/^\s*-\s*build/m);
  });

  it('includes SonarQube scanner invocation', () => {
    expect(ciContent).toContain('sonar-scanner');
  });

  it('exits SonarQube job with code 0 regardless of findings', () => {
    expect(ciContent).toContain('exit 0');
  });

  it('includes Vercel dry-run build', () => {
    expect(ciContent).toContain('vercel build');
  });
});

// ── vercel.json validation ────────────────────────────────────────────────────
describe('vercel.json', () => {
  const cfg = readJSON(abs('vercel.json'));

  it('is valid JSON', () => {
    expect(cfg).not.toBeNull();
  });

  it('points buildCommand at the frontend workspace', () => {
    expect(cfg?.buildCommand).toContain('frontend');
  });

  it('points outputDirectory at frontend/dist', () => {
    expect(cfg?.outputDirectory).toBe('frontend/dist');
  });

  it('configures api/export-checklist.js with maxDuration', () => {
    expect(cfg?.functions?.['api/export-checklist.js']?.maxDuration).toBeGreaterThan(0);
  });
});

// ── api/chat-stream.js validation ────────────────────────────────────────────
describe('api/chat-stream.js', () => {
  const src = existsSync(abs('api/chat-stream.js'))
    ? readFileSync(abs('api/chat-stream.js'), 'utf8')
    : '';

  it("exports Vercel Edge Runtime config `{ runtime: 'edge' }`", () => {
    expect(src).toContain("runtime: 'edge'");
  });

  it('implements rate limiting logic', () => {
    expect(src).toContain('isRateLimited');
  });

  it('uses SSE format', () => {
    expect(src).toContain('text/event-stream');
  });

  it('sends [DONE] sentinel to close the stream', () => {
    expect(src).toContain('[DONE]');
  });

  it('imports schema from lib/', () => {
    expect(src).toContain('../lib/schema.js');
  });
});

// ── api/export-checklist.js validation ───────────────────────────────────────
describe('api/export-checklist.js', () => {
  const src = existsSync(abs('api/export-checklist.js'))
    ? readFileSync(abs('api/export-checklist.js'), 'utf8')
    : '';

  it('uses pdfkit for PDF generation', () => {
    expect(src).toContain('pdfkit');
  });

  it('returns application/pdf content type', () => {
    expect(src).toContain('application/pdf');
  });

  it('does not write to the filesystem (no fs.writeFile)', () => {
    expect(src).not.toContain('writeFile');
    expect(src).not.toContain('writeFileSync');
  });

  it('imports schema from lib/', () => {
    expect(src).toContain('../lib/schema.js');
  });
});

// ── lib/schema.js validation ──────────────────────────────────────────────────
describe('lib/schema.js', () => {
  const src = existsSync(abs('lib/schema.js'))
    ? readFileSync(abs('lib/schema.js'), 'utf8')
    : '';

  it('uses mongoose', () => {
    expect(src).toContain('mongoose');
  });

  it('defines bilingual en/fr fields in a single document schema', () => {
    expect(src).toContain('en:');
    expect(src).toContain('fr:');
  });

  it('uses procedure_code as primary lookup key with unique index', () => {
    expect(src).toContain('procedure_code');
    expect(src).toContain('unique: true');
  });

  it('exports Procedure model', () => {
    expect(src).toContain('export const Procedure');
  });
});
