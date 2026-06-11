# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ProcedureBot CM** is a bilingual (English/French) civic assistant for Cameroonian administrative procedures. It uses a WhatsApp-style chat UI with no user authentication, optimized for 3G mobile networks.

**Target deployment:** Vercel (serverless/edge) + MongoDB Atlas + Google Gemini API (`gemini-1.5-flash`)

---

## Monorepo Structure

```
/
├── frontend/          # React 18 SPA (Vite, Tailwind CSS, shadcn/ui)
├── backend/
│   ├── api/
│   │   ├── chat-stream.js       # Vercel Edge Function — Gemini RAG + SSE streaming
│   │   └── export-checklist.js  # Vercel Serverless Function — PDF generation
│   ├── shared/
│   │   └── schema.js            # Mongoose/MongoDB bilingual document schema
│   └── scripts/
│       └── seed.js              # Seeds 10 Cameroonian procedures into Atlas
├── .env.example                 # GEMINI_API_KEY, MONGODB_URI, NODE_ENV
└── .gitlab-ci.yml               # Lint → SonarQube (warning-only) → Vercel dry-run
```

---

## Development Commands

*(Project is in planning phase — commands below reflect the intended setup once scaffolded.)*

```bash
# Root workspace
npm install               # Install all workspace dependencies
npm run dev               # Start frontend dev server (Vite)
npm run seed              # Populate MongoDB Atlas with 10 procedures

# Testing
npm run test              # Run Vitest/Jest unit tests
npm run test:e2e          # Run Playwright/Cypress E2E tests
npm run lint              # ESLint across frontend and backend

# Local Vercel emulation
npx vercel dev            # Emulate Edge/Serverless functions locally
```

---

## Architecture & Key Design Decisions

### Data Layer
- **Single bilingual document per procedure:** all `en`/`fr` content lives in one MongoDB document (not separate collections). This is intentional — it keeps transactional reads atomic and avoids cross-collection joins.
- The `procedure_code` field is the primary lookup key throughout the app. Payloads from the frontend always include `procedure_code` + `language` (`en`|`fr`).

### Streaming Pipeline
- `chat-stream.js` runs on the **Vercel Edge Runtime** (`export const config = { runtime: 'edge' }`) to avoid serverless timeouts during long AI streams.
- Gemini output is piped through the Web Streams API into **Server-Sent Events (SSE)** format: `data: {"text": "..."}\n\n`.
- The React frontend consumes the stream via `EventSource` or `fetch` with a reader loop, appending tokens word-by-word into component state.

### Gemini RAG Guardrails
The system prompt injected into every Gemini call enforces strict RAG behavior:
1. Respond **only** from the injected MongoDB document — never guess costs, timelines, or steps.
2. If the answer is not in the document, explicitly say so.
3. If the query is off-topic, provide minimal general context and instruct the user to change the procedure via the top dropdown.
4. Always respond in the user's selected language (`en` or `fr`).

### Rate Limiting
`chat-stream.js` implements an **IP-based token-bucket rate limiter** (max 10 requests/minute per IP) to protect the free-tier Gemini API key. This logic runs inside the edge function — no external middleware.

### PDF Export
`export-checklist.js` runs on the standard Vercel Serverless runtime. It uses `pdfkit` (or equivalent) to generate PDFs in-memory and streams the binary buffer directly as `application/pdf` — **no filesystem writes**. This keeps the cold-start memory footprint minimal.

### CI/CD — SonarQube Warning Gate
The GitLab pipeline is configured with a **warning-only SonarQube gate**: security anomalies are logged to artifacts but the job exits with code `0`, so deployments are never blocked. This is intentional for the academic/free-tier context of the project.

---

## Environment Variables

| Variable | Where Used |
|---|---|
| `GEMINI_API_KEY` | `chat-stream.js` — Vercel Environment Variables only, never client-side |
| `MONGODB_URI` | `chat-stream.js`, `export-checklist.js`, `seed.js` — server-side only |
| `NODE_ENV` | Build tooling |

---

## Testing Strategy

| Layer | Tool | What to verify |
|---|---|---|
| Schema/DB | Vitest + `mongodb-memory-server` | Bilingual field isolation, no cross-language contamination |
| Edge API | Vitest mocks | SSE chunk format, rate limiter rejection, off-topic guardrail |
| PDF export | Vitest | `HTTP 400` on bad payloads, binary buffer returned on valid input |
| UI components | React Testing Library | Language toggle, dropdown state change, auto-scroll trigger |
| E2E | Playwright/Cypress | Full flow under Slow 3G throttle (400ms RTT, 400kbps); assert FCP and steady token stream |

---

## The 10 Core Procedures

The seed script must populate data for these Cameroonian administrative procedures (both `en` and `fr`):

1. National ID Card
2. Birth Certificate
3. Business Registration
4. Marriage Certificate
5. Passport
6. Driver's License
7. Land Title
8. Criminal Record Extract
9. Death Certificate
10. School Certificate Authentication
