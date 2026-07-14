export type UseCase = 'coding' | 'writing' | 'data' | 'research' | 'mixed';

export interface ToolInput {
  name: string;
  plan: string;
  monthlySpend: number;
  seats: number;
}

export interface AuditInput {
  teamSize: number;
  primaryUseCase: UseCase;
  tools: ToolInput[];
}

export interface ToolAuditResult {
  name: string;
  plan: string;
  currentSpend: number;
  recommendedAction: string;
  recommendedSpend: number;
  savings: number;
  reason: string;
}

export interface AuditResult {
  totalCurrentSpend: number;
  totalRecommendedSpend: number;
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  toolResults: ToolAuditResult[];
  teamSize: number;
  primaryUseCase: UseCase;
}
