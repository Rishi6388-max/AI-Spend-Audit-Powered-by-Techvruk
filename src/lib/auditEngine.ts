import { AuditInput, AuditResult, ToolAuditResult, ToolInput } from "../types";

export function runAudit(input: AuditInput): AuditResult {
  const toolResults: ToolAuditResult[] = [];
  const { teamSize, primaryUseCase, tools } = input;

  // Track tools for potential duplication/redundancy checks
  const hasCursor = tools.some(t => t.name.toLowerCase().includes("cursor"));
  const hasCopilot = tools.some(t => t.name.toLowerCase().includes("copilot"));
  const hasWindsurf = tools.some(t => t.name.toLowerCase().includes("windsurf"));
  const hasClaude = tools.some(t => t.name.toLowerCase().includes("claude"));
  const hasChatGPT = tools.some(t => t.name.toLowerCase().includes("chatgpt"));

  for (const tool of tools) {
    const nameLower = tool.name.toLowerCase();
    const planLower = tool.plan.toLowerCase();
    const currentSpend = tool.monthlySpend;
    const seats = tool.seats || 1;

    let recommendedPlan = tool.plan;
    let recommendedSpend = currentSpend;
    let recommendedAction = "Keep current plan";
    let reason = "Your current configuration is optimal for this tool.";

    // 1. CURSOR AUDIT
    if (nameLower.includes("cursor")) {
      if (planLower.includes("business") && seats <= 2) {
        // Business is $40/user, Pro is $20/user.
        const idealCost = seats * 20;
        if (currentSpend > idealCost) {
          recommendedPlan = "Pro";
          recommendedSpend = idealCost;
          recommendedAction = "Downgrade to Pro";
          reason = `For teams of ${seats} user(s), the $40/user Business plan is excessive. Downgrading to the $20/user Pro plan maintains identical core editor features and saves $20/seat/month.`;
        }
      } else if (planLower.includes("pro") && hasWindsurf) {
        // Redundancy with Windsurf
        recommendedPlan = "Windsurf Pro";
        recommendedSpend = seats * 15; // Windsurf is $15
        recommendedAction = "Consolidate on Windsurf Pro";
        reason = `Both Cursor Pro ($20/mo) and Windsurf Pro ($15/mo) are in use. Consolidating onto Windsurf Pro saves $5/user/month while keeping a unified AI coding editor stack.`;
      } else if (planLower.includes("pro") && hasCopilot) {
        // Redundancy with Copilot
        recommendedPlan = "Pro (Cancel Copilot)";
        recommendedSpend = currentSpend;
        recommendedAction = "Cancel GitHub Copilot";
        reason = `Cursor Pro ($20/mo) includes state-of-the-art native autocomplete. Subscribing to separate GitHub Copilot licenses ($10-$19/mo) is redundant and can be safely eliminated.`;
      }
    }

    // 2. GITHUB COPILOT AUDIT
    else if (nameLower.includes("copilot")) {
      if (hasCursor) {
        // If they use Cursor and Copilot, Copilot can be fully eliminated
        recommendedPlan = "None";
        recommendedSpend = 0;
        recommendedAction = "Cancel Copilot completely";
        reason = `Cursor Pro has its own superior tab-autocomplete and inline editing. Having separate Copilot licenses is redundant; cancel Copilot to save 100% of its cost.`;
      } else if (planLower.includes("enterprise") && seats <= 10) {
        // Enterprise is $39, Business is $19
        const idealCost = seats * 19;
        if (currentSpend > idealCost) {
          recommendedPlan = "Business";
          recommendedSpend = idealCost;
          recommendedAction = "Downgrade to Business";
          reason = `GitHub Copilot Enterprise is $39/mo, whereas Business is $19/mo. For small teams (under 10 seats), Enterprise features like custom model fine-tuning are rarely fully utilized. Downgrading saves $20/seat/month.`;
        }
      }
    }

    // 3. CLAUDE AUDIT
    else if (nameLower.includes("claude")) {
      if (planLower.includes("team")) {
        // Team has a minimum of 5 seats ($25/user/mo). Total min = $125/mo.
        const actualActiveUsers = Math.min(seats, teamSize);
        if (actualActiveUsers < 5) {
          const proCost = actualActiveUsers * 20;
          if (currentSpend > proCost) {
            recommendedPlan = "Pro";
            recommendedSpend = proCost;
            recommendedAction = "Downgrade to Pro";
            reason = `Claude Team requires a minimum of 5 seats ($125/mo). Since you only have ${actualActiveUsers} active user(s), switching to individual Pro licenses ($20/mo) saves $${currentSpend - proCost}/month.`;
          }
        }
      } else if (planLower.includes("pro") && hasChatGPT) {
        // Duplicated chat subscriptions
        recommendedPlan = "Pro (Consolidate)";
        recommendedSpend = currentSpend;
        recommendedAction = "Consolidate chat platforms";
        reason = `Co-subscribing to both Claude Pro ($20/mo) and ChatGPT Plus ($20/mo) for the same seats is rarely necessary. Claude 3.5 Sonnet is highly multi-capable; consolidating saves $20/user/month.`;
      } else if (planLower.includes("enterprise")) {
        // Enterprise Claude is roughly $75/mo
        const idealCost = seats * 25; // Downgrade to Team or Pro
        if (currentSpend > idealCost) {
          recommendedPlan = "Team";
          recommendedSpend = idealCost;
          recommendedAction = "Downgrade to Team";
          reason = `Claude Enterprise ($75/mo estimated) is overkill for standard workflows. Downgrading to Team ($25/mo) preserves collaborative workspaces and shared projects, saving ~$50/seat/month.`;
        }
      }
    }

    // 4. CHATGPT AUDIT
    else if (nameLower.includes("chatgpt")) {
      if (hasClaude && !planLower.includes("api")) {
        recommendedPlan = "None";
        recommendedSpend = 0;
        recommendedAction = "Cancel ChatGPT / Use Claude Pro";
        reason = `Your team has both Claude Pro and ChatGPT Plus. Standardizing on Claude Pro for coding and writing workflows allows you to cancel ChatGPT Plus, saving $20/seat/month.`;
      } else if (planLower.includes("team") && seats <= 2) {
        // ChatGPT Team requires a 2-seat minimum.
        // If seats is 1, they are paying for 2 seats ($50-$60/mo). Downgrading to Plus ($20) is better.
        const plusCost = seats * 20;
        if (currentSpend > plusCost) {
          recommendedPlan = "Plus";
          recommendedSpend = plusCost;
          recommendedAction = "Downgrade to Plus";
          reason = `ChatGPT Team has a 2-seat minimum ($50-$60/mo). For a single user, downgrading to ChatGPT Plus ($20/mo) saves at least $10-$30/month with identical reasoning capabilities.`;
        }
      }
    }

    // 5. ANTHROPIC / OPENAI API DIRECT
    else if (nameLower.includes("anthropic api") || nameLower.includes("openai api") || planLower.includes("api direct")) {
      // Suggest shifting 40% of standard/classification/summarization queries to Gemini 1.5 Flash (which is ~10-20x cheaper than Claude 3.5 Sonnet or GPT-4o)
      // Say 40% reduction in costs
      const potentialSpend = Math.round(currentSpend * 0.4);
      recommendedSpend = potentialSpend;
      recommendedPlan = "Hybrid API (with Gemini Flash)";
      recommendedAction = "Route standard calls to Gemini Flash";
      reason = `Routing high-volume semantic tasks (classification, summarization, entity extraction) to Gemini 1.5 Flash (which is ~10-20x cheaper than Claude/GPT-4o) reduces total API spend by up to 60%.`;
    }

    // 6. GEMINI AUDIT
    else if (nameLower.includes("gemini")) {
      if (planLower.includes("ultra") || planLower.includes("advanced")) {
        // Gemini Advanced is $20. If they have Claude Pro or ChatGPT Plus already, cancel Gemini
        if (hasClaude || hasChatGPT) {
          recommendedPlan = "None";
          recommendedSpend = 0;
          recommendedAction = "Cancel Gemini Advanced";
          reason = `Since you already pay for Claude or ChatGPT, Gemini Advanced is a redundant general chat subscription. Cancel to save $20/seat/month.`;
        }
      }
    }

    // 7. WINDSURF AUDIT
    else if (nameLower.includes("windsurf")) {
      if (planLower.includes("team") && seats <= 2) {
        const proCost = seats * 15;
        if (currentSpend > proCost) {
          recommendedPlan = "Pro";
          recommendedSpend = proCost;
          recommendedAction = "Downgrade to Pro";
          reason = `Windsurf Team is $30/user/mo, while Pro is $15/user/mo. For small teams, Pro is sufficient, saving $15/seat/month.`;
        }
      }
    }

    const savings = Math.max(0, currentSpend - recommendedSpend);

    toolResults.push({
      name: tool.name,
      plan: tool.plan,
      currentSpend,
      recommendedAction,
      recommendedSpend,
      savings,
      reason
    });
  }

  // Cross-tool optimization: check if they have duplicate subscriptions that we can bundle/save
  // Let's summarize
  const totalCurrentSpend = toolResults.reduce((sum, r) => sum + r.currentSpend, 0);
  const totalRecommendedSpend = toolResults.reduce((sum, r) => sum + r.recommendedSpend, 0);
  const totalMonthlySavings = totalCurrentSpend - totalRecommendedSpend;
  const totalAnnualSavings = totalMonthlySavings * 12;

  return {
    totalCurrentSpend,
    totalRecommendedSpend,
    totalMonthlySavings,
    totalAnnualSavings,
    toolResults,
    teamSize,
    primaryUseCase
  };
}
