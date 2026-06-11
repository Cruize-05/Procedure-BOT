import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env for local dev — Railway injects env vars directly in production
const envPath = path.join(__dirname, '.env');
try {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // No .env file — relying on process.env (Railway production)
}

const { default: chatHandler } = await import('./api/chat-stream.js');
const { default: pdfHandler } = await import('./api/export-checklist.js');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const STATIC_DIR = path.join(__dirname, 'frontend', 'dist');
const INDEX_HTML = path.join(STATIC_DIR, 'index.html');

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const mime = MIME[ext] ?? 'application/octet-stream';
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch {
    // Not found → SPA fallback
    try {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(INDEX_HTML));
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, 'http://localhost');

  // POST /api/chat-stream — Edge-style handler (Request → Response)
  if (url.pathname === '/api/chat-stream') {
    if (req.method !== 'POST') {
      res.writeHead(405);
      return res.end('Method Not Allowed');
    }
    const rawBody = await readBody(req);
    const ip = (req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown')
      .split(',')[0]
      .trim();

    const webReq = new Request('http://localhost/api/chat-stream', {
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
      const pump = async () => {
        const { done, value } = await reader.read();
        if (done) { res.end(); return; }
        res.write(value);
        await pump();
      };
      await pump();
    } else {
      res.end();
    }
    return;
  }

  // POST /api/export-checklist — Serverless-style handler (req/res)
  if (url.pathname === '/api/export-checklist') {
    if (req.method !== 'POST') {
      res.writeHead(405);
      return res.end('Method Not Allowed');
    }
    const rawBody = await readBody(req);
    let body = {};
    try { body = JSON.parse(rawBody); } catch { /* leave empty */ }

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

  // Static file serving — SPA fallback for unknown routes
  const filePath = path.join(STATIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  serveStatic(res, filePath);
});

const PORT = process.env.PORT ?? 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Listening on http://0.0.0.0:${PORT}`);
});
