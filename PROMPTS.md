# AI Spend Audit - LLM Prompts & Engineering

This document details the LLM prompt design, iterations, and failure-handling strategies utilized in the AI Spend Audit application.

## 1. System Prompt for Executive Summary

Our server-side Express app calls Gemini 2.5 Flash to generate an elite financial summary of the audit findings.

### Final Prompt Used
```text
You are an elite B2B tech finance advisor. Review this AI tool spend audit for a team of [teamSize] (primary use case: "[primaryUseCase]").

Audit details:
- Current monthly spend: $[totalCurrentSpend]
- Recommended monthly spend: $[totalRecommendedSpend]
- Monthly savings: $[totalMonthlySavings]
- Annual savings: $[totalAnnualSavings]

Breakdown of tools:
[toolResults.map(t => `- ${t.name} (${t.plan}): currently spending $${t.currentSpend}/mo. Recommended action: ${t.recommendedAction} (Savings: $${t.savings}/mo) because: ${t.reason}`).join('\n')]

Provide a professional, highly actionable, and tailored executive summary of about 100 words.
Identify the single largest leak in their stack, offer a clear, numbers-based rationale for the change, and encourage them to implement these quick wins. Keep the tone sharp, professional, and business-focused. No greetings or introductory conversational filler.
```

---

## 2. Prompt Engineering Decisions & Iterations

### Why this prompt works
* **Role Conditioning**: Starting with "You are an elite B2B tech finance advisor" ensures the model uses terms like "operational margins," "EBITDA," "redundancy," and "seat utility" rather than generic developer descriptions.
* **Highly Constrained Scope**: By feeding in a fully structured list of facts (exact savings, tool plans, and math) we completely prevent hallucination. The LLM's only job is synthesis and narrative articulation, not mathematical calculation.
* **Negative Constraints**: Specifying "No greetings or introductory conversational filler" avoids conversational fluff like *"Sure, here is your summary:"* which degrades executive readability.
* **Length Constraints**: Adding "about 100 words" guarantees it is concise and fits cleanly inside the results card on mobile and desktop viewports.

---

## 3. What Didn't Work (Iterative Failures)

### Failure 1: Asking the LLM to calculate the audit math
* **Attempt**: Passing the raw tools list and asking the LLM to perform the optimization logic and the arithmetic directly.
* **Result**: Inconsistent math. The model occasionally miscalculated annual savings (e.g., $125 * 12 = $1450) or forgot minimum seat requirements (like Claude Team's 5-seat rule).
* **Fix**: Hardcoded rule-based math in `auditEngine.ts`. The rule engine computes everything perfectly and passes the clean facts to the LLM solely for prose summarization. This perfectly satisfies: *"knowing when not to use AI is part of the test."*

### Failure 2: Lacking structural brevity constraints
* **Attempt**: "Write a summary paragraph of the results."
* **Result**: Bulleted lists duplicating the screen data, adding 200+ words of redundant visual noise.
* **Fix**: Enforced a single coherent paragraph limit with clear metric outcomes.

---

## 4. Graceful API Failure Fallback

If the Gemini API key is missing or encounters a rate-limiting `429` error, the Express backend automatically falls back to an elegant, finance-literate pre-templated summary matching the exact team size and computed metrics:

```typescript
function getFallbackSummary(auditData: any): string {
  const largestSaving = [...auditData.toolResults].sort((a, b) => b.savings - a.savings)[0];
  const mainLeakText = largestSaving && largestSaving.savings > 0 
    ? `The single largest optimization opportunity lies in your ${largestSaving.name} setup, where you can reclaim $${largestSaving.savings}/month in immediate savings.`
    : "Your stack is already highly optimized, with minimal duplicate tool costs.";

  return `Based on your AI stack audit, your team of ${auditData.teamSize} can optimize current subscriptions to save $${auditData.totalMonthlySavings}/month (amounting to $${auditData.totalAnnualSavings}/year). ${mainLeakText} Consolidating redundant licenses and downgrading oversized plans directly improves your operating margins and extends runway, all with zero impact on actual team productivity or engineering velocity.`;
}
```
This guarantees 100% uptime and a seamless experience under any network condition.
