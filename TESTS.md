# Automated Tests Documentation (TESTS.md)

This document lists the automated test coverage for the AI Spend Audit application, specifically validating our deterministic financial recommendation engine.

---

## 1. Test Suite Location & Runner
* **Test File**: `/src/lib/auditEngine.test.ts`
* **Test Runner**: [Vitest](https://vitest.dev/) (Vite-native testing framework)
* **Configuration**: Runs inside our ESM package environment with TypeScript support.

---

## 2. Test Cases and Coverage

The suite contains **5 comprehensive, edge-case unit tests** that validate the deterministic rules engine under varying parameters:

### Test 1: `should detect Claude Team minimum seat redundancy`
* **What it covers**: Verifies that when a small team (e.g., 2 users) subscribes to Claude Team (which has a strict 5-seat minimum base rate of $125/mo), the engine correctly flags this and recommends downgrading to individual Pro licenses ($20/user/mo), saving the client exactly $85/month.
* **Assertions**:
  - Confirms total monthly savings is exactly `$85`.
  - Confirms the recommended plan is updated to `"Pro"`.
  - Confirms the recommended monthly tool spend drops to `$40`.

### Test 2: `should recommend downgrading Cursor Business with small seats`
* **What it covers**: Validates that single-seat users on Cursor's Business plan ($40/user) are flagged to downgrade to the Pro plan ($20/user), since Business administration and SAML/SSO features are underutilized at this scale.
* **Assertions**:
  - Confirms savings of exactly `$20/month`.
  - Confirms recommendation action is `"Downgrade to Pro"`.

### Test 3: `should eliminate Copilot redundancy if Cursor is used`
* **What it covers**: Validates the cross-tool redundancy rule. If a developer uses both Cursor Pro ($20/mo) and separate GitHub Copilot Individual ($10/mo), the engine flags GitHub Copilot for complete cancellation, saving 100% of its subscription cost.
* **Assertions**:
  - Confirms Copilot recommended spend is set to `$0`.
  - Confirms recommended action is `"Cancel Copilot completely"`.

### Test 4: `should handle API direct routing recommendations for Anthropic API`
* **What it covers**: Verifies that users spending on raw API tokens (Anthropic or OpenAI) are recommended a hybrid routing configuration, sending standard tasks to Gemini 1.5 Flash to cut average API expenses by 60%.
* **Assertions**:
  - Confirms recommended spend is set to exactly 40% of the original spend.
  - Confirms action is `"Route standard calls to Gemini Flash"`.

### Test 5: `should leave correct/optimal configuration untouched`
* **What it covers**: Guarantees that a clean, highly optimized AI stack is not forced into manufactured savings. Honesty builds trust.
* **Assertions**:
  - Confirms total monthly savings is exactly `$0`.
  - Confirms action is `"Keep current plan"`.

---

## 3. How to Run the Tests

To execute the automated test suite locally, run:

```bash
npm run test
```

### Verification Verification Output
```text
> react-example@0.0.0 test
> vitest run

 RUN  v4.1.10 /app/applet
 
 ✓ src/lib/auditEngine.test.ts (5 tests) 9ms
 
 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  11:10:46
   Duration  368ms
```
All tests run in less than half a second and verify complete logic correctness.
