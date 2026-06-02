// Local dev API server — runs on port 3001, proxied from Vite on port 3000
// Adapts both Vercel handlers (Edge + Serverless) to Node http without extra deps.
import http from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// ── Load .env manually (no dotenv dep needed) ─────────────────────────────
const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '.env');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.warn('[dev-server] .env not found — relying on process.env');
}

// ── Import handlers ───────────────────────────────────────────────────────
const { default: chatHandler } = await import('./api/chat-stream.js');
const { default: pdfHandler } = await import('./api/export-checklist.js');

// ── Helper: read full body as string ─────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ── Server ────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, 'http://localhost:3001');

  // ── /api/chat-stream  (Edge-style: Request → Response) ─────────────────
  if (url.pathname === '/api/chat-stream') {
    if (req.method !== 'POST') {
      res.writeHead(405);
      return res.end('Method Not Allowed');
    }
    const rawBody = await readBody(req);
    const ip = (req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown')
      .split(',')[0]
      .trim();

    const webReq = new Request('http://localhost:3001/api/chat-stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: rawBody,
    });

    let webRes;
    try {
      webRes = await chatHandler(webReq);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }

    res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));

    if (webRes.body) {
      const reader = webRes.body.getReader();
      const flush = async () => {
        const { done, value } = await reader.read();
        if (done) { res.end(); return; }
        res.write(value);
        await flush();
      };
      await flush();
    } else {
      res.end();
    }
    return;
  }

  // ── /api/export-checklist  (Serverless-style: req/res) ─────────────────
  if (url.pathname === '/api/export-checklist') {
    if (req.method !== 'POST') {
      res.writeHead(405);
      return res.end('Method Not Allowed');
    }
    const rawBody = await readBody(req);
    let body = {};
    try { body = JSON.parse(rawBody); } catch { /* leave empty */ }

    // Shim Express-like req/res
    const mockReq = { method: 'POST', body };
    const mockRes = {
      _status: 200,
      _headers: {},
      status(code) { this._status = code; return this; },
      setHeader(k, v) { this._headers[k] = v; return this; },
      json(obj) {
        this._headers['Content-Type'] = 'application/json';
        res.writeHead(this._status, this._headers);
        res.end(JSON.stringify(obj));
      },
      send(buf) {
        res.writeHead(this._status, this._headers);
        res.end(buf);
      },
    };

    try {
      await pdfHandler(mockReq, mockRes);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(3001, () => {
  console.log('[dev-server] API listening on http://localhost:3001');
});
