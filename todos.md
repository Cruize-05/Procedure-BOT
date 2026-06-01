Here is your thorough, step-by-step `todo.md` checklist. It is structured to follow a test-driven development (TDD) approach, moving from the DevOps foundation all the way to frontend integration, performance throttling tests, and production launch.

You can copy and paste this directly into a markdown file in your repository.

---

# `todo.md` — ProcedureBot CM Implementation Checklist

## 📋 Phase 1: Workspace Scaffolding & CI/CD Setup

* [ ] **1.1 Initialize Monorepo Directory Layout**
* [ ] Create root project directory.
* [ ] Initialize frontend project: `/frontend` (React 18, Vite, Tailwind CSS, shadcn/ui).


* [ ] Initialize serverless backend structure: `/backend/api/` (for Vercel Edge/Serverless functions).


* [ ] Create workspace configuration root `package.json`.


* [ ] **1.2 Setup Environment Configurations**
* [ ] Create root `.env.example` file mapping: `GEMINI_API_KEY`, `MONGODB_URI`, `NODE_ENV`.
* [ ] Set up local development scripts to emulate Vercel runtime behaviors natively.


* [ ] **1.3 Build GitLab CI/CD Pipeline Configuration**
* [ ] Create `.gitlab-ci.yml` in the repository root.


* [ ] Configure syntax/linting validation stage for Javascript/Typescript files.
* [ ] Configure SonarQube integration stage.


* [ ] Modify SonarQube rules to log anomalies/security vulnerabilities as **Warnings** only, forcing an exit code of `0` so deployments aren't blocked.


* [ ] Add Vercel dry-run compilation stage into the pipeline config.




* [ ] **1.4 TDD Verification**
* [ ] Write directory structure and basic syntax baseline sanity unit tests using Vitest/Jest.
* [ ] Commit files and verify the pipeline passes cleanly on GitLab with SonarQube warning flags operational.





---

## 🗄️ Phase 2: Database Layer & Data Seeding

* [ ] **2.1 Implement Unified Bilingual MongoDB Schema**
* [ ] Install Mongoose or native MongoDB database driver primitives in `/backend`.


* [ ] Create `/backend/shared/schema.js`.
* [ ] Define document model storing *both* English and French variations inside a single schema string.


* [ ] Ensure strict schema properties match:
* [ ] `procedure_code`: String (Unique, Indexed, Required)
* [ ] `name`: Object { `en`: String, `fr`: String }


* [ ] `target_office`: Object { `en`: String, `fr`: String }


* [ ] `official_cost_cfa`: Number (Default: 0)


* [ ] `estimated_timeline`: Object { `en`: String, `fr`: String }


* [ ] `required_documents`: Object { `en`: [String], `fr`: [String] }


* [ ] `steps`: Object { `en`: [{step_number: Number, instruction: String}], `fr`: [{step_number: Number, instruction: String}] }






* [ ] **2.2 Create Database Seeding Script**
* [ ] Create automated script `/backend/scripts/seed.js`.
* [ ] Compile verified data for the **top 10 critical administrative procedures** in Cameroon (e.g., National ID Card, Birth Certificate, Business Registration).


* [ ] Program script to safely drop existing entries before populating collections to avoid duplicate documents.


* [ ] **2.3 TDD Verification**
* [ ] Set up an in-memory database configuration suite using `mongodb-memory-server`.
* [ ] Write integration test ensuring database connectivity, schema execution, and validation that bilingual content streams separately without field cross-pollution.



---

## 🤖 Phase 3: Serverless Streaming API Integration

* [ ] **3.1 Build Serverless Endpoint Wrapper & Rate Limiter**
* [ ] Create `/backend/api/chat-stream.js`.
* [ ] Configure the explicit **Vercel Edge Runtime** engine flag (`export const config = { runtime: 'edge' };`) to prevent serverless execution cut-offs.
* [ ] Code a memory-safe, IP-based token-bucket rate limiting logic to intercept excessive API requests and guard the Gemini free-tier bounds.


* [ ] **3.2 Embed Google Gemini RAG Architecture**
* [ ] Install the official `@google/genai` Node.js SDK client package.
* [ ] Code logic to capture incoming client payloads: `procedure_code`, `userMessage`, `isInitialGreeting`, `language`.
* [ ] Build database fetch routines mapping dynamic data targets from MongoDB Atlas.
* [ ] Design the structural system prompt instructions for `gemini-1.5-flash`:
* [ ] Explicitly lock responses to data inside the injected database payload.
* [ ] Block the AI from guessing or answering if factual variables are missing from the record.


* [ ] Force output matching selected user language context (`en` / `fr`).


* [ ] Implement the **Soft Redirect Guardrail**: If an off-topic query occurs, generate general background metadata but clearly direct them to alternate the application selection drop-down matrix.




* [ ] **3.3 Configure Real-Time SSE Response Loop**
* [ ] Map Gemini chunk responses natively via `ai.models.generateContentStream`.
* [ ] Enqueue chunks via standard `ReadableStream` conforming to **Server-Sent Events (SSE)** syntax formatting boundaries (`data: {"text": "..."}\n\n`).


* [ ] **3.4 TDD Verification**
* [ ] Write mock execution tests intercepting requests to `/api/chat-stream`.
* [ ] Validate proper generation of chunk blocks and check off-topic payload rejection handling properties.



---

## 📄 Phase 4: Document Checklist Generation Service

* [ ] **4.1 Create PDF Export Function**
* [ ] Create serverless function module at `/backend/api/export-checklist.js`.
* [ ] Set function target configuration parameter to standard Vercel Serverless environment execution settings.
* [ ] Install a lightweight streaming compilation library package (e.g., `pdfkit` or a serverless-friendly wrapper).


* [ ] **4.2 Code Document Template Rendering Logic**
* [ ] Standardize a clean layout structure (Official Header layout, Metadata grid block mapping Cost and Timeline metrics, Checklist matrix matching array requirements).
* [ ] Ensure full text-encoding support so accents and localized typographic parameters for French and English translate cleanly to the canvas layout.




* [ ] **4.3 Implement Binary Streaming Response**
* [ ] Prevent file writes to localized server paths.
* [ ] Format request response parameters (`Content-Type: application/pdf`, `Content-Disposition: attachment; filename=checklist.pdf`).
* [ ] Stream completed output files cleanly via pure binary stream payload buffers to minimize server-side footprint.


* [ ] **4.4 TDD Verification**
* [ ] Write validation tests evaluating structural processing components inside `/api/export-checklist`.
* [ ] Confirm bad payloads or empty array arguments return clean `HTTP 400` codes instead of executing server faults.



---

## 📱 Phase 5: Mobile-First WhatsApp-Style UI

* [ ] **5.1 Initialize Application Configurations & Styling**
* [ ] Configure Tailwind CSS configurations to guarantee lean compilation and highly optimized page bundle footprints.
* [ ] Verify asset configurations meet low bandwidth baseline requirements for **3G network** operations.




* [ ] **5.2 Implement Frictionless Layout Shell**
* [ ] Build core viewport wrapper matching a clean single page look.
* [ ] **Strict Constraint:** Ensure no registration pages, account creation routes, or input fields exist in the workflow.




* [ ] **5.3 Build Header Component**
* [ ] Add the branding layout elements representing **ProcedureBot CM**.


* [ ] Incorporate the main application interactive dropdown selection picker component.
* [ ] Add a quick language toggle widget switch changing locale configuration variables (`en` / `fr`) globally.




* [ ] **5.4 Build Conversational Dialogue Tray**
* [ ] Implement traditional chat bubbles styled visually following standard **WhatsApp layout conventions**.


* [ ] Build the real-time chat text block generation state hooks.
* [ ] Implement a custom React component hook that tracks the bottom of the active chat view and automatically shifts scroll locks downwards when new data segments arrive.




* [ ] **5.5 TDD Verification**
* [ ] Write UI view component tests using React Testing Library.
* [ ] Assert drop-down selection shifts global layout properties, toggles function flags correctly, and confirms chat panel items expand smoothly.



---

## 🔌 Phase 6: E2E Integration & Performance Verification

* [ ] **6.1 Wire Component Interactions to API Pipelines**
* [ ] Connect drop-down menu mutations to the primary `/api/chat-stream` API.
* [ ] Ensure selection triggers automatic fetch and initializes a greeting stream mapping out the selected procedure variables.


* [ ] Wire user form submit handlers directly into standard EventSource reading hooks to loop incoming AI tokens natively into state memory variables.
* [ ] Attach the PDF compilation button trigger down to `/api/export-checklist` data arrays.


* [ ] **6.2 Build System Error Isolation Protocols**
* [ ] Implement global error boundary blocks inside the chat pane.
* [ ] Program recovery UI prompts: If database connectivity failures or AI rate boundaries are hit, print friendly, bilingual alerting indicators into the message container view instead of collapsing application states.


* [ ] **6.3 Throttled Performance Integration Review**
* [ ] Set up comprehensive automated browser tracking routines using Playwright or Cypress.
* [ ] Apply hard throttling network profile parameter boundaries inside execution scripts to simulate **Slow 3G Network speeds** (400ms latency, 400kbps download bandwidth limitations).


* [ ] Validate full loop performance metrics:
* [ ] Measure that First Contentful Paint benchmarks initialize efficiently.
* [ ] Ensure streamed chunk data objects populate the chat history arrays steadily without bottlenecking UI tracking layers.
* [ ] Confirm PDF checklist buttons execute clean stream responses over restricted lines without drops.




* [ ] **6.4 Deploy Project Production Package**
* [ ] Push clean codebase updates via GitLab repository branch configurations.


* [ ] Review SonarQube quality indicators post-launch for optimization items.


* [ ] Map environmental variable parameters securely into the Vercel app production environment settings.