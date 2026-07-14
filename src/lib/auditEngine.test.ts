import { describe, it, expect } from "vitest";
import { runAudit } from "./auditEngine";
import { AuditInput } from "../types";

describe("Audit Engine Tests", () => {
  it("should detect Claude Team minimum seat redundancy", () => {
    const input: AuditInput = {
      teamSize: 2,
      primaryUseCase: "coding",
      tools: [
        {
          name: "Claude",
          plan: "Team",
          monthlySpend: 125, // Claude Team minimum 5 seats is $125
          seats: 2
        }
      ]
    };

    const result = runAudit(input);
    expect(result.totalMonthlySavings).toBeGreaterThan(0);
    expect(result.toolResults[0].recommendedAction).toBe("Downgrade to Pro");
    expect(result.toolResults[0].recommendedSpend).toBe(40); // 2 seats * $20
    expect(result.totalMonthlySavings).toBe(85);
  });

  it("should recommend downgrading Cursor Business with small seats", () => {
    const input: AuditInput = {
      teamSize: 1,
      primaryUseCase: "coding",
      tools: [
        {
          name: "Cursor",
          plan: "Business",
          monthlySpend: 40,
          seats: 1
        }
      ]
    };

    const result = runAudit(input);
    expect(result.toolResults[0].recommendedAction).toBe("Downgrade to Pro");
    expect(result.toolResults[0].recommendedSpend).toBe(20);
    expect(result.totalMonthlySavings).toBe(20);
  });

  it("should eliminate Copilot redundancy if Cursor is used", () => {
    const input: AuditInput = {
      teamSize: 1,
      primaryUseCase: "coding",
      tools: [
        {
          name: "Cursor",
          plan: "Pro",
          monthlySpend: 20,
          seats: 1
        },
        {
          name: "GitHub Copilot",
          plan: "Individual",
          monthlySpend: 10,
          seats: 1
        }
      ]
    };

    const result = runAudit(input);
    const copilotResult = result.toolResults.find(r => r.name.toLowerCase().includes("copilot"));
    expect(copilotResult).toBeDefined();
    expect(copilotResult?.recommendedSpend).toBe(0);
    expect(copilotResult?.recommendedAction).toBe("Cancel Copilot completely");
  });

  it("should handle API direct routing recommendations for Anthropic API", () => {
    const input: AuditInput = {
      teamSize: 10,
      primaryUseCase: "coding",
      tools: [
        {
          name: "Anthropic API Direct",
          plan: "API Direct",
          monthlySpend: 500,
          seats: 10
        }
      ]
    };

    const result = runAudit(input);
    expect(result.totalMonthlySavings).toBe(300); // 500 - 200 (60% savings, recommendedSpend = 40% = 200)
    expect(result.toolResults[0].recommendedAction).toBe("Route standard calls to Gemini Flash");
  });

  it("should leave correct/optimal configuration untouched", () => {
    const input: AuditInput = {
      teamSize: 5,
      primaryUseCase: "coding",
      tools: [
        {
          name: "Cursor",
          plan: "Pro",
          monthlySpend: 100, // 5 * 20
          seats: 5
        }
      ]
    };

    const result = runAudit(input);
    expect(result.totalMonthlySavings).toBe(0);
    expect(result.toolResults[0].recommendedAction).toBe("Keep current plan");
  });
});
