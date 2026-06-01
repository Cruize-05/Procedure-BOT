## Section 1: Development Blueprint & Iterative Roadmap

This blueprint details a test-driven, highly incremental strategy for building **ProcedureBot CM** on Vercel and MongoDB Atlas using the Google Gemini API. The engineering plan relies on small, verifiable milestones to ensure architectural stability and continuous quality integration via GitLab CI/CD.

### Architectural Milestones

1. **Phase 1: Environment Setup & CI/CD Pipeline Foundation** (Establish local developer configs, Vercel structures, and the GitLab CI/CD pipeline integrated with a SonarQube warning gate).


2. **Phase 2: Database Layer & Seed Automation** (Establish MongoDB Atlas schemas and strict bilingual indexing validation).


3. **Phase 3: Serverless Streaming API Integration** (Build Vercel Edge Functions utilizing Server-Sent Events to stream Gemini 1.5 Flash outputs safely under tight system prompts).


4. **Phase 4: Document Checklist Generation Service** (Implement a clean PDF compilation microservice on Vercel Serverless to deliver downloadable assets).


5. **Phase 5: Mobile-Optimized WhatsApp-Style UI** (Build a highly responsive, fast React 18 single page application matching the required conversational design).


6. **Phase 6: Comprehensive Routing, Dropdown Wiring, & E2E Verification** (Tie components together, route procedure definitions dynamically, and test execution behavior under simulated 3G environments).



---

### Granular Execution Steps

```
[Phase 1: Pipeline] ──► [Phase 2: DB Schema] ──► [Phase 3: Gemini Stream]
                                                        │
[Phase 6: E2E Wiring] ◄── [Phase 5: Mobile UI] ◄──── [Phase 4: PDF Export]

```

#### Phase 1: Environment Setup & CI/CD Pipeline Foundation

* **Step 1.1:** Initialize a structured monorepo folder layout comprising `/frontend` (React 18 SPA) and `/backend` (Vercel functions config). Author a comprehensive configuration for local environment execution using a mock setup.
* **Step 1.2:** Draft a rigorous `.gitlab-ci.yml` pipeline specification detailing build validation jobs and integrating a SonarQube quality gate configured explicitly to log warnings and permit progression without pipeline breakdown.



#### Phase 2: Database Layer & Seed Automation

* **Step 2.1:** Implement the bilingual MongoDB document schema using Mongoose/native primitives inside `/backend/shared/schema.js`, forcing absolute structural alignment across both language channels inside individual records.


* **Step 2.2:** Author a robust database seeding automation utility to inject the initial 10 critical Cameroonian administrative procedures into MongoDB Atlas, complete with comprehensive integration test suites checking bilingual field synchronization.



#### Phase 3: Serverless Streaming API Integration

* **Step 3.1:** Implement an IP-based rate limiter logic in `/backend/api/chat-stream.js` alongside standard mock streaming response endpoints to insulate Gemini API usage from exhaustion spikes.
* **Step 3.2:** Write the Vercel Edge Function wrapper calling the `@google/genai` client, grounding interactions natively in the database document context, and managing real-time data output chunks via Server-Sent Events (SSE).

#### Phase 4: Document Checklist Generation Service

* **Step 4.1:** Build a dedicated, isolated serverless function at `/backend/api/export-checklist.js` running a PDF layout engine to compile data variables cleanly into binary streams.


* **Step 4.2:** Integrate a testing sequence ensuring that arrays of objects match the PDF template perfectly and return correct buffers directly to client requests without memory leaks.



#### Phase 5: Mobile-Optimized WhatsApp-Style UI

* **Step 5.1:** Set up a lightweight React 18 template with Tailwind CSS and `shadcn/ui` components inside `/frontend`, verifying bundle size baselines to safeguard 3G processing efficiency.


* **Step 5.2:** Build the UI view containing a persistent procedure selection dropdown alongside a chat interface matching WhatsApp styling conventions, complete with automated bottom auto-scrolling execution triggers.



#### Phase 6: Comprehensive Routing, Dropdown Wiring, & E2E Verification

* **Step 6.1:** Wire the React client states directly into the Server-Sent Events stream backend, forcing components to correctly render real-time typography adjustments when selection data mutations happen.


* **Step 6.2:** Apply comprehensive network throttling configurations across localized testing runners to confirm that First Contentful Paint metrics load efficiently inside emulated slow 3G network environments.



---

## Section 2: Code Generation Prompt Series

### Prompt 1: Project Scaffolding & Monorepo CI/CD Pipeline Configuration

```text
System Role: You are an expert systems engineer specializing in serverless monorepo design, Vercel deployments, and GitLab CI/CD automation.

Task: Implement the project foundational directory structure and automated pipeline integration for "ProcedureBot CM" using a test-driven development mindset.

Requirements:
1. Create a monorepo file structure containing a `/frontend` directory for a React 18 SPA and a `/backend` folder structured for Vercel Serverless/Edge Functions configuration.
2. Provide a fully valid, detailed `.gitlab-ci.yml` pipeline file. The pipeline must define stages for:
   - linting/syntax checking
   - security scanning via SonarQube
   - dry-run compilation using the Vercel CLI.
3. Configure the SonarQube integration inside `.gitlab-ci.yml` as a Warning Gate. If quality anomalies or security warnings are identified, log them to console/artifacts explicitly, but exit with code 0 to allow the pipeline to proceed to successive stages without breaking the deployment execution.
4. Include an enterprise-grade package.json setup in the root directory mapping workspace commands, alongside a local environment configuration guide using a `.env.example` template covering variables for `GEMINI_API_KEY`, `MONGODB_URI`, and `NODE_ENV`.
5. Author a baseline configuration sanity test suite using Vitest or Jest to verify the workspace structure validation during the linting pipeline phase. Ensure every asset is completely integrated and fully documented.

```

### Prompt 2: Bilingual MongoDB Schema & Seed Automation Configuration

```text
System Role: You are an expert backend engineer and database architect specialized in MongoDB Atlas, bilingual application schema layouts, and strict data persistence modeling.

Task: Build the foundational data access layers and data injection automation mechanisms for ProcedureBot CM in a fully test-driven manner.

Requirements:
1. Write a strict MongoDB database schema file in JavaScript/TypeScript using Mongoose semantics or native primitives. The document model must house both English and French procedural definitions natively within a unified document scheme.
2. The schema fields must strictly incorporate:
   - `procedure_code`: Unique identifier string.
   - `name`: Object specifying required `en` and `fr` strings.
   - `target_office`: Object specifying required `en` and `fr` strings.
   - `official_cost_cfa`: Number primitive defaulting to 0.
   - `estimated_timeline`: Object specifying required `en` and `fr` strings.
   - `required_documents`: Object mapping language arrays (`en: [String]`, `fr: [String]`).
   - `steps`: Object containing ordered bilingual instruction tracking fields (`en: [{step_number: Number, instruction: String}]`, `fr: [{step_number: Number, instruction: String}]`).
3. Author an automated database seeding configuration script (`seed.js`) that safely establishes connection bounds, drops existing collections if required, and injects clean mock validation data for the top 10 critical administrative actions (e.g., National ID Card, Birth Certificate).
4. Provide a functional, standalone test configuration script that boots an in-memory database simulation (using `mongodb-memory-server` or similar unit-testing mocks), runs the seeding pipeline, and asserts that fields can be retrieved cleanly without field collision or cross-contamination across language variants.

```

### Prompt 3: Vercel Edge Function Core for Real-Time Gemini Stream Processing

```text
System Role: You are an elite AI engineer and Node.js serverless expert specialized in Vercel Edge runtime layers, the Google Gemini API ecosystem, and Server-Sent Events (SSE) stream configurations.

Task: Implement a bulletproof Vercel Edge API endpoint at `/backend/api/chat-stream.js` that ingests user prompts, references specific database definitions, and streams a grounded, real-time response from `gemini-1.5-flash` with robust rate-limiting and system prompt guardrails.

Requirements:
1. Define an active Vercel Edge configuration runtime inside the module file (`export const config = { runtime: 'edge' };`).
2. Integrate a production-ready, memory-safe IP-based token bucket rate limiter tracking logic directly inside the serverless wrapper to prevent free-tier Google Gemini API key exhaustion from malicious usage spikes.
3. Utilize the official Google Gen AI SDK syntax to invoke `gemini-1.5-flash` using `ai.models.generateContentStream` or an equivalent streaming chunk generator.
4. Construct a strict System Instruction prompt layout inside the function that locks Gemini into a tight Retrieval-Augmented Generation (RAG) structure. Inject the MongoDB record directly into the context, forcing the model to:
   - Rely solely on data contained in the document.
   - Decline to guess or formulate answers if facts are omitted from the document.
   - Respond perfectly in the requested locale (`en` or `fr`).
   - Perform a soft redirect if queries are off-topic or target alternate procedures. If the user prompts out of context, output general administrative background information if possible, but explicitly direct them to switch the selected category via the frontend top dropdown menu.
5. Transform Gemini's stream response natively into standard Server-Sent Events chunks (`data: {"text": "..."}\n\n`) utilizing the Web Streams API (`ReadableStream`).
6. Deliver a comprehensive unit testing framework file that intercepts requests, mocks Gemini stream outputs, and verifies error handling parameters for edge runtime environments.

```

### Prompt 4: PDF Document Checklist Generation Serverless Service

```text
System Role: You are a principal backend software architect expert in PDF generation utilities, serverless memory optimization on Vercel, and binary data stream handling over HTTP.

Task: Implement a standalone Vercel Serverless Function located at `/backend/api/export-checklist.js` that transforms dynamic document checklists into stylized, clean downloadable PDF buffers.

Requirements:
1. Process post payloads containing specific language selections and unified procedure data models passed down from client actions.
2. Initialize and configure a lightweight, serverless-compatible PDF layout generator engine (e.g., `pdfkit` or a clean HTML-to-PDF compiler canvas using native libraries). 
3. Style the output PDF document cleanly to ensure professional readability: output a prominent official header title, a clean metric box for "Official Cost" and "Estimated Timeline", and an interactive checkbox checklist mapping out every item parsed inside the `required_documents` array field. Ensure text strings render correctly for both French and English characters.
4. Avoid any localized filesystem write mutations. Stream the completed compiled PDF layout data directly back to the calling client context by setting the appropriate headers (`Content-Type: application/pdf`, `Content-Disposition: attachment; filename=checklist.pdf`) and transmitting a pure binary buffer.
5. Create a robust test suite that evaluates the serverless function behavior. Verify that structural validation data fields are cleanly extracted, and assert that malformed payloads trigger graceful HTTP 400 error codes without throwing unhandled server processes or hanging serverless execution bounds.

```

### Prompt 5: Mobile-First WhatsApp-Style React 18 User Interface Components

```text
System Role: You are a principal frontend engineer specializing in React 18 single page applications, performance optimization over low-bandwidth 3G pipelines, Tailwind CSS layout techniques, and accessible interactive mechanics.

Task: Build the complete user interface components shell inside `/frontend` matching a mobile-first, high-speed WhatsApp layout convention that runs efficiently on limited bandwidth.

Requirements:
1. Scaffold an optimized React 18 SPA skeleton structure mapping custom configurations for Tailwind CSS and styling elements with `shadcn/ui` button and container utilities. 
2. Implement a layout structure that provides frictionless user onboarding. No profile creation fields, authentication inputs, or account registrations are permitted.
3. Position an absolute procedure navigation container drop-down selector component prominently at the top header pane, loaded with options representing the target administrative action workflows.
4. Implement the chat dialog interface strictly mimicking traditional mobile messaging workflows (e.g., conversational bubble layouts, distinct color indicators for system and incoming responses, responsive message input bar tracking typing states).
5. Integrate a custom React layout reference hook tracking chat timeline updates. Whenever state variables expand with new message additions, trigger a programmatic animation lock that auto-scrolls the active viewport container down smoothly to show the latest text chunks.
6. Author interactive frontend test frameworks using React Testing Library to verify that language switches execute without component breaks, state manipulation arrays update perfectly, and viewports shift to match new message additions.

```

### Prompt 6: Complete End-to-End Core Integration & Network Throttling Verification

```text
System Role: You are an elite principal Full-Stack Engineer and Core Systems Integration QA Lead expert in performance profiling, network-throttled benchmarking, and full end-to-end multi-tier stream verification.

Task: Wire all isolated client and backend serverless endpoints together into an interconnected ecosystem, then establish integration testing architectures validating system performance over throttled connections.

Requirements:
1. Integrate the React 18 client state with the `/backend/api/chat-stream.js` Vercel Edge API endpoint via standard browser EventSource or Fetch stream processing loops.
2. Ensure that selecting an entity from the frontend dropdown automatically triggers a payload delivery to fetch the document from MongoDB Atlas and stream the introductory briefing from Gemini covering costs, timeline, and document lists.
3. Connect the frontend "Download Checklist PDF" button component directly to the `/backend/api/export-checklist.js` serverless function, allowing the browser to capture binary streams and execute direct localized system download requests without breaking the chat session state.
4. Handle communication and environment disruptions gracefully across all architectural bounds: if database fetches timeout or Gemini limits break, display localized, user-friendly bilingual warning callouts directly inside the messaging tray instead of crashing components.
5. Provide a full end-to-end Playwright or Cypress integration automation file that spins up the full full-stack architecture, selects a procedure, reads streamed tokens, downloads the generated PDF, and simulates **Slow 3G Network Throttling** parameters (e.g., 400ms RTT, 400kbps down). Assert that the First Contentful Paint loads quickly and that text chunks render steadily to confirm deployment viability for production networks.

```