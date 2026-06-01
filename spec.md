# Full Technical Specification Document: ProcedureBot CM

**Project Lead:** Ekwebe Caleb Apparandi (Matricule: CT23AO49)

**Target Environment:** Vercel (Serverless/Edge) & MongoDB Atlas

**AI Engine:** Google Gemini API (Free Tier via Google AI Studio)

---

## 1. Executive Summary & Problem Statement

ProcedureBot CM is a bilingual (English/French), mobile-optimized civic assistant application engineered to navigate the procedurally opaque landscape of Cameroonian public administration. The platform aims to decentralize access to accurate procedural information, eliminate the reliance on predatory *facilitateurs*, and minimize wasted administrative trips for citizens trying to secure foundational documents (e.g., birth certificates, national ID cards, business registrations).

To maximize accessibility, the system requires **no user authentication/account creation** and mimics a familiar **WhatsApp-style conversational interface** optimized to operate efficiently over volatile **3G mobile networks**.

---

## 2. System Architecture & Component Stack

The platform is designed to minimize complexity and maintenance overhead using a modern JavaScript/TypeScript ecosystem paired with a serverless computing architecture.

```
┌────────────────────────────────────────────────────────┐
│               React 18 SPA Frontend                   │
│   (Hosted on Vercel, Styled with Tailwind & shadcn)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ (Server-Sent Events Streams)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Vercel Edge / Serverless Functions          │
│            (Node.js Runtime API Processing)            │
└───────┬────────────────────────────────────────┬───────┘
        │                                        │
        │ (Database Ingestion)                   │ (Strict Context Prompting)
        ▼                                        ▼
┌───────────────────────┐                ┌───────────────────────┐
│     MongoDB Atlas     │                │   Google Gemini API   │
│ (Cloud Document Store)│                │  (gemini-1.5-flash)   │
└───────────────────────┘                └───────────────────────┘

```

### 2.1 Component Specifications

* **Frontend Core:** React 18 organized as a Single Page Application (SPA) utilizing `react-router` for client-side view management.


* **UI Framework:** Tailwind CSS and `shadcn/ui` components for rapid, scannable layouts.


* **Backend Interface:** Node.js API code executed entirely within Vercel Serverless and Edge Functions.


* **Database:** MongoDB Atlas cloud cluster acting as the immutable source of truth for administrative data.


* **AI Service:** Google Gemini API using the `gemini-1.5-flash` model via the `@google/genai` Node.js SDK to execute high-speed, cost-effective Retrieval-Augmented Generation (RAG).

---

## 3. Data Handling & Schema Modeling

Database records store full internationalization (i18n) data natively within a single document to ensure easy updates and high transactional cohesion.

### 3.1 MongoDB Collection: `procedures`

```json
{
  "_id": "ObjectId",
  "procedure_code": { "type": "String", "unique": true, "required": true },
  "name": {
    "en": { "type": "String", "required": true },
    "fr": { "type": "String", "required": true }
  },
  "target_office": {
    "en": { "type": "String", "required": true },
    "fr": { "type": "String", "required": true }
  },
  "official_cost_cfa": { "type": "Number", "required": true, "default": 0 },
  "estimated_timeline": {
    "en": { "type": "String", "required": true },
    "fr": { "type": "String", "required": true }
  },
  "required_documents": {
    "en": [{ "type": "String" }],
    "fr": [{ "type": "String" }]
  },
  "steps": {
    "en": [{ "step_number": "Number", "instruction": "String" }],
    "fr": [{ "step_number": "Number", "instruction": "String" }]
  }
}

```

---

## 4. Detailed Core Workflows

### 4.1 Flow 1: Session Entry & Initial Greeting

1. The user visits the application landing page. No login or profile creation is permitted.


2. The user selects one of the 10 critical administrative procedures via a prominent top-level dropdown component.


3. The frontend sends the chosen `procedure_code` and selected interface language (`en` or `fr`) to the backend.
4. The backend pulls the matching document from MongoDB Atlas.


5. The backend initializes a streaming generation request to the Gemini API, forcing it to construct a friendly, introductory summary detailing the **Official Cost, Estimated Timeline, and Required Documents** using *only* the retrieved document.



### 4.2 Flow 2: Real-Time Chat Streaming

* **Transport Mechanism:** Real-time conversational responses are executed using **Vercel Edge Functions** supporting the standard Web Streams API to completely bypass serverless execution timeouts.
* **Data Transport:** Communication from the backend back to the React UI happens via **Server-Sent Events (SSE)**.
* **Frontend Mutation:** As text blocks arrive chunk-by-chunk, the React frontend streams the message string word-by-word into the message history array.


* **Viewport Lock:** The chat window must automatically execute an auto-scroll layout sequence to keep the most recent tokens readable at the base of the viewport.



### 4.3 Flow 3: PDF Document Checklist Export

1. The user clicks a "Download Checklist PDF" button located inside the chat view.


2. The frontend passes the relevant data fields to a dedicated Vercel Serverless endpoint.
3. The serverless function invokes a Node.js compiler library (such as `pdfkit` or `puppeteer`) to generate a clean, highly stylized page template containing the official document requirement fields.


4. The backend returns a binary buffer directly to the client browser, forcing a localized file download to keep client data consumption low on 3G devices.



---

## 5. Security Guardrails & AI Instructions

### 5.1 System Prompt Constraints (RAG Guardrails)

To guarantee strict compliance with verified information and stop hallucinations entirely, the system context prompt passed to `gemini-1.5-flash` must integrate these exact rules:

> **Role:** You are ProcedureBot CM, a bilingual, deeply empathetic AI civic guide operating within Cameroon.
> 
> 
> **Knowledge Grounding:** Your single source of truth is the verified database string provided here: `[INSERT_DATABASE_DOCUMENT]`. You must extract responses strictly from this text block.
> 
> 
> **Hallucination Interception:** If a user asks a question whose answer cannot be validated or found within the provided database string, you must state that you do not have that specific information. Never guess, infer, or assume rules, costs, or timelines.
> 
> 
> **Out-of-Scope Handling (Soft Redirect):** If the user changes topics to general civil matters or requests deep details on an alternate procedure, provide minor general administrative context if possible, but explicitly instruct them to use the interactive dropdown component at the top of the app interface to transition to the proper procedure context.

### 5.2 Application Security & Rate Limiting

* **Secret Exclusion:** The `GEMINI_API_KEY` and MongoDB URI string must reside exclusively in the protected Vercel Environment Variables dashboard. No client-side code blocks may reference these variables.


* **Rate Limiting Layer:** To protect the free-tier Gemini API key bounds from abuse, the backend endpoints must invoke an IP-address rate limiter module limiting requests to a maximum threshold (e.g., 10 chat adjustments per minute).

---

## 6. DevOps & Automated Quality Pipeline

The application build framework is structured within **GitLab CI/CD** to handle automated testing and handoff steps.

### 6.1 SonarQube Quality Gate (Warning Configuration)

* **Analysis Execution:** On code check-in, the GitLab pipeline spins up an inspection process via SonarQube to analyze React modules and Node routes for security defects (like injection threats) and codebase anomalies.


* **Pipeline Logic:** Operating under a **Warning Gate** architecture, any identified vulnerabilities or code anomalies are captured and logged to developer telemetry systems. The pipeline will **not fail**, enabling continuous integration and letting the Vercel CLI step push updates immediately to production.



---

## 7. Implementation & Testing Plan

Developers must validate application criteria across these three explicit phases before finalizing the production build.

### 7.1 Stage 1: Local API & Database Validation

* **Mock Schema Ingestion:** Populate a local development instance with at least two testing documents structured in Option A's layout (bilingual fields inside one document).


* **Endpoint Stream Integrity:** Test the serverless streaming endpoint locally to ensure Server-Sent Events pass content correctly without token drops or blocking.

### 7.2 Stage 2: RAG Validation & Adversarial Testing

* **Hallucination Check:** Submit input phrases like *"How much extra bribe money do I give the clerk?"* or *"Can you write me a recipe for puff-puff?"*. Confirm that the Gemini API system prompt accurately catches the intent and declines to answer or softly redirects based on the guardrail rules.
* **Bilingual Match Testing:** Ensure that switching the interface language properly routes client payloads to query the matching locale subfields (`en` vs. `fr`) within the data document.



### 7.3 Stage 3: Network & Edge Performance Validation

* **Network Emulation:** Use browser development utilities to throttle connectivity down to a simulated **Slow 3G** state (300ms latency, limited download speeds).


* **Success Metrics:** Verify that the primary React layout assets pack triggers a First Contentful Paint (FCP) rapidly, and verify that real-time word-by-word text streaming outputs text chunks smoothly without freezing the UI thread.