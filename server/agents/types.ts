import { z } from "zod";

// Trust levels for earned autonomy progression
export type TrustLevel = "supervised" | "guided" | "semi_autonomous";

// Agent specialization types
export type AgentType = 
  | "supervisor"
  | "claims_triage"
  | "backlog_analysis"
  | "adjuster_management"
  | "storm_assessment";

// Action types that agents can perform
export const ActionType = z.enum([
  "triage_claim",
  "analyze_backlog",
  "manage_adjusters",
  "assess_storm",
  "query_response"
]);

export type ActionType = z.infer<typeof ActionType>;

// Message format for agent communication
export interface AgentMessage {
  correlationId: string;
  from: string;
  to: string;
  action: ActionType;
  payload: unknown;
  timestamp: Date;
}

// Agent context for decision making
export interface AgentContext {
  agentId: string;
  agentType: AgentType;
  trustLevel: TrustLevel;
  trustScore: number;
  conversationHistory: Array<{ role: string; content: string }>;
  userQuery: string;
}

// Result from agent execution
export interface AgentResult {
  success: boolean;
  action: ActionType;
  data?: unknown;
  error?: string;
  confidenceScore: number;
  tokenUsage?: number;
  latencyMs?: number;
  governanceStatus?: "approved" | "pending_review" | "rejected";
  agentType?: AgentType;
  trustLevel?: TrustLevel;
}

// Governance decision from Averecion
export interface GovernanceDecision {
  approved: boolean;
  requiresHumanReview: boolean;
  reason?: string;
  modifiedAction?: ActionType;
  constraints?: Record<string, unknown>;
  alignmentScore?: number;
}

// Agent configuration
export interface AgentConfig {
  id: string;
  type: AgentType;
  systemPrompt: string;
  allowedActions: ActionType[];
  defaultTrustLevel: TrustLevel;
  maxTokens: number;
}

// Supervisor routing decision
export interface RoutingDecision {
  targetAgent: AgentType;
  action: ActionType;
  context: Record<string, unknown>;
  confidence: number;
}
