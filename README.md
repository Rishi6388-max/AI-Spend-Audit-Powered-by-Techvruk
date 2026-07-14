# AI Spend Audit — TechVruk Web Intern Build

An interactive, B2B lead-generation web application designed to help startups analyze their AI developer subscription portfolios, uncover wasteful double-spending, and capture thousands of dollars in hidden annual savings. Built for high-growth Series A/B engineering leads, fractional CFOs, and finance operators looking to trim SaaS waste with 100% deterministic accuracy and bespoke AI-powered executive recommendations.

---

---

## 🚀 Quick Start: Installation & Local Development

### 1. Prerequisite Installations
Ensure you have Node.js (v18+) and npm installed.

### 2. Install Dependencies
Clone the repository and run:
```bash
npm install
```

### 3. Setup Local Environment
Create a `.env` file in the root directory and append your credentials (or duplicate `.env.example`):
```env
GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"
APP_URL="http://localhost:3000"
```

### 4. Run Locally (Full-Stack Dev Server)
Boot both the Express API and Vite React client simultaneously with hot reloading:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Running Automated Tests
To run the deterministic audit engine tests:
```bash
npm run test
```

### 6. Production Compiling and Building
Build the optimized static frontend assets and compile the server-side TypeScript entry point into a single, high-performance, bundled CommonJS server file:
```bash
npm run build
```
Launch the compiled production app:
```bash
npm run start
```

---

## 💡 "Decisions" — Five Critical Trade-offs

Here are five key architectural and product trade-offs made during development and why:

1. **Deterministic Calculations vs. Generative LLMs for Pricing Math**
   * *Trade-off*: We coded all pricing parameters and recommendations into a structured TypeScript rule engine (`/src/lib/auditEngine.ts`) rather than asking Gemini to "figure out" the savings.
   * *Why*: LLMs frequently struggle with precise multi-parameter arithmetic and are prone to hallucinatory drift. By keeping the calculations 100% deterministic, we ensure CFO-ready accuracy, restricting Gemini solely to writing the narrative prose.
2. **Value-First anonymous entry vs. Authentication Gating**
   * *Trade-off*: We made the tool 100% free with zero login walls, delaying email capture until the final report save.
   * *Why*: Requiring user sign-up or Slack SSO on entry creates massive funnel friction. Our "value-first" approach establishes high trust, maximizing audit completions and increasing final consultation close rates.
3. **Dual-Mode Static/Dynamic Server Interceptor vs. Standard SPA Rendering**
   * *Trade-off*: We built a custom Express server router to intercept sharing links (`/share/:id`) and inject SEO Meta Open Graph tags inline before serving the page, rather than relying on standard React-Helmet client rendering.
   * *Why*: Search crawlers (Slack, X, LinkedIn) do not execute client-side JS bundles. Server-side string replacement guarantees gorgeous social preview cards with zero runtime performance penalties.
4. **IP-Based Memory Map Limiter vs. Heavy Database Rates**
   * *Trade-off*: Implemented an in-memory IP request map in Express to enforce lead submission ceilings, rather than using an external Redis instance.
   * *Why*: This minimizes server cold-start times, keeps deployment dependencies lightweight, and is more than sufficient for standard MVP-scale traffic.
5. **Firebase Web Client SDK in Backend vs. Admin SDK**
   * *Trade-off*: Initialized Firestore in `server.ts` using the standard Firebase JS Client package instead of compiling `firebase-admin`.
   * *Why*: Admin SDK configuration requires static GCP Service Account JSON keys which are unsafe to bundle in simple environments. The Web Client SDK works seamlessly in Node, utilizing existing config parameters safely.

---

## 🌐 Live Deployed URL
* **Production Deployed Web App**: (https://ai-spend-audit-powered-by-techvruk.dwivedirishiprasad.workers.dev)
