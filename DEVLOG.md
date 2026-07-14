# Developer Log (DEVLOG.md)

Daily progress log for the AI Spend Audit engineering sprint.

---

## Day 1 — 2026-07-08
**Hours worked:** 3
**What I did:**
- Conducted exhaustive user discovery regarding startup AI spend habits.
- Analyzed and structured pricing schemas for Cursor, Copilot, Claude, ChatGPT, Gemini, and Windsurf.
- Drafted the core JSON schema for audit payloads and result objects in `/src/types.ts`.
**What I learned:**
- Startups frequently duplicate editor autocomplete subscriptions (e.g., subscribing to both GitHub Copilot and Cursor Pro simultaneously) due to a lack of awareness that Cursor Pro includes native high-performance autocompletion.
**Blockers / what I'm stuck on:**
- Designing a pricing table structure that cleanly models variable minimum seat requirements (like ChatGPT Team's 2-seat and Claude Team's 5-seat minimum bounds).
**Plan for tomorrow:**
- Implement the deterministic rules-based core engine (`/src/lib/auditEngine.ts`) and write automated unit test suites to guarantee calculation precision.

---

## Day 2 — 2026-07-09
**Hours worked:** 4
**What I did:**
- Implemented the deterministic pricing rule set in `/src/lib/auditEngine.ts`.
- Wrote 5 highly rigorous unit tests in `/src/lib/auditEngine.test.ts` covering seat-count logic, duplication checks, and downgrade boundaries.
- Installed `vitest` and successfully ran the test suite.
**What I learned:**
- Deterministic systems are drastically superior to generative LLMs for currency calculations, while LLMs shine at prose generation.
**Blockers / what I'm stuck on:**
- Ran into type mismatch errors in Vitest's module resolution because of TS compiler config quirks. Solved by updating Vite aliases.
**Plan for tomorrow:**
- Design the Express backend proxy server to securely communicate with the Gemini API and database without exposing private credentials.

---

## Day 3 — 2026-07-10
**Hours worked:** 3
**What I did:**
- Created the Express `server.ts` entry point supporting hot-reloaded development via Vite middleware and production compilation via Esbuild.
- Integrated the `@google/genai` model `gemini-2.5-flash` to handle the audit narrative synthesis.
- Built-in graceful fallback logic to provide a highly coherent templated executive summary if the API key is unconfigured.
**What I learned:**
- Using `appType: 'spa'` in Vite's createServer configuration is critical for Express routing fallbacks to operate smoothly on custom subpaths.
**Blockers / what I'm stuck on:**
- Getting Vite's HMR websocket connection errors in local sandboxes. Resolved by configuring Vite to watch files conditionally based on env variables.
**Plan for tomorrow:**
- Set up Cloud Firestore database storage for capturing leads and generating unique public sharing links.

---

## Day 4 — 2026-07-11
**Hours worked:** 2
**What I did:**
- Provisioned Firestore database with custom database ID specified in the workspace settings.
- Initialized Firestore connection in `/src/lib/firebase.ts` with explicit Web Client parameters.
- Implemented `/api/lead` and `/api/share` POST endpoints inside `server.ts` to log customer metadata and generate share IDs.
**What I learned:**
- Firebase Web client runs perfectly in Node.js backend runtimes, removing the need for heavy, key-dependent GCP Admin SDK configuration.
**Blockers / what I'm stuck on:**
- Handling database lookup errors on nonexistent IDs. Resolved by adding robust `snap.exists()` checks inside the sharing endpoint.
**Plan for tomorrow:**
- Build out the primary frontend landing page and multi-step AI spend input form.

---

## Day 5 — 2026-07-12
**Hours worked:** 5
**What I did:**
- Designed a polished, modern, high-contrast Slate slate-styled UI container using Tailwind CSS.
- Developed the multi-step interactive form supporting dynamic seat counts, use cases, and tool plan additions.
- Configured local storage persistence to guarantee form entries are retained across browser reloads.
**What I learned:**
- Form density on mobile must be optimized. Adding responsive collapse elements to tool items prevents user scrolling fatigue.
**Blockers / what I'm stuck on:**
- State synchronization when users delete a tool item. Fixed by updating the parent state via standard functional array filters.
**Plan for tomorrow:**
- Implement the interactive results dashboard, visual savings meters, and the dynamic email-gate capture modal.

---

## Day 6 — 2026-07-13
**Hours worked:** 4
**What I did:**
- Coded the results screen with visual gauge bars, dynamic savings charts, and distinct recommendation cards.
- Integrated the backend `/api/summary` to fetch the real-time Gemini personalized review.
- Built the lead capture popup modal with honey-pot and rate-limiting anti-abuse protection.
**What I learned:**
- Displaying potential annual savings (computed monthly savings * 12) in large display typography has a significantly higher conversion impact than only showing small monthly items.
**Blockers / what I'm stuck on:**
- Custom OG Tags rendering before client JavaScript boots. Resolved by implementing a custom dynamic string-replace interceptor inside `server.ts` for `/share/:id` routes.
**Plan for tomorrow:**
- Complete final polishing, compile builds, run full test suites, and perform end-to-end user experience flow validation.

---

## Day 7 — 2026-07-14
**Hours worked:** 4
**What I did:**
- Fine-tuned typography pairings using Inter and JetBrains Mono fonts.
- Conducted end-to-end routing validation of public links (`/share/:id`) to ensure strict PII data omission.
- Executed `npm run test` and `tsc --noEmit` to verify code correctness and green build state.
- Generated comprehensive README and business analysis documents (`GTM.md`, `ECONOMICS.md`, etc.).
**What I learned:**
- A professional UI relies heavily on balanced negative space, high contrast, and micro-interactions (such as subtle hover translation effects) rather than flashy, complex page components.
**Blockers / what I'm stuck on:**
- Ensuring Vite and Express play nicely in the production CJS esbuild compilation bundle. Resolved by excluding external node packages cleanly in the esbuild configurations.
**Plan for tomorrow:**
- Prepare submission form details and deliver the complete production-ready application.
