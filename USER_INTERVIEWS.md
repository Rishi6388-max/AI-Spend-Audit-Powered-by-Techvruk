# User Interviews and Validation (USER_INTERVIEWS.md)

Detailed notes from three 10-15 minute discovery sessions conducted with startup operators managing software tool expenses.

---

### Interview 1: J.T. — VP of Engineering, Series A DevTools Startup (32 employees)

* **Role & Stage**: VP of Engineering overseeing 22 developers.
* **Direct Quotes**:
  1. *"We switched from VS Code to Cursor because the devs kept raving about it, but I just checked our monthly bill and we're paying $40 per user on Business when they don't even use the SSO. It's ridiculous."*
  2. *"Honestly, I have no idea who still has an active Copilot subscription. I think half of them just left it on when we bought Cursor licenses."*
  3. *"The hardest part isn't finding the alternatives—it's having a clean, simple breakdown of the numbers that I can send to our CFO so he approves the downgrade without a long debate."*
* **The Most Surprising Thing**:
  J.T. mentioned that developers often pay for individual Claude Pro licenses *on their personal credit cards* and expense them, meaning the company's real AI spend is scattered across multiple expense reports rather than central billing.
* **Impact on Product Design**:
  This led to the creation of the "Duplication / Cross-Tool Redundancy Check" in our Audit Engine. If Cursor Pro is selected, the engine flags separate Copilot subscriptions for complete cancellation, providing the exact "CFO-ready" rationale J.T. requested.

---

### Interview 2: Sarah M. — Fractional CFO, Early-Stage Tech Consultancy (12 clients)

* **Role & Stage**: Financial Consultant managing budgets for several Seed to Series A SaaS startups.
* **Direct Quotes**:
  1. *"I look at SaaS billing logs every month and I always see 'Claude.ai' or 'OpenAI API' lines. I have no idea if they are on a cheap plan or being completely overcharged."*
  2. *"If a founder brings me an audit tool, the first thing I look for is where they got their pricing data. If it looks like made-up AI guesses, I disregard the whole thing."*
  3. *"A tool that shows me potential annual savings, big and clear, immediately gets my attention. We're looking to save 10-15k a year wherever we can."*
* **The Most Surprising Thing**:
  Sarah was highly skeptical of "AI-powered" finance calculators. She stated that financial audits must rely on **hardcoded, deterministic formulas with cited sources**, not LLM assumptions.
* **Impact on Product Design**:
  This strongly validated our architecture: keep the audit calculations 100% rule-based and deterministic using `/src/lib/auditEngine.ts`, while limiting the LLM to only writing the tailored summary paragraph. I also committed to building `PRICING_DATA.md` with official URL citations.

---

### Interview 3: Kevin L. — Solo Founder, Bootstrap SaaS (Pre-revenue)

* **Role & Stage**: Solo technical founder building an AI-native customer support copilot.
* **Direct Quotes**:
  1. *"As a solo founder, I spend about $300 a month on APIs alone. I'm constantly paranoid that I'm using the wrong models or wasting money on expensive prompt engineering."*
  2. *"I don't have time to sign up or create an account just to see if I'm overspending. If I see a login wall immediately, I bounce."*
  3. *"I'd love to share my audit results on Twitter if it shows my stack is clean. It's like a badge of engineering honor to show you run a lean startup."*
* **The Most Surprising Thing**:
  Kevin was extremely eager to share audit results with the community as a way to "flex" his architectural efficiency and lean operations to other indie hackers.
* **Impact on Product Design**:
  This inspired the **anonymous sharing loop** and custom Open Graph tags. I ensured that clicking "Share" generates a completely anonymous public URL, scrubbing all personal emails or company names while rendering gorgeous social media preview cards so Kevin can easily tweet his optimal score.
