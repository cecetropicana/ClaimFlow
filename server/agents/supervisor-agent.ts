import { BaseAgent } from "./base-agent";
import type { AgentConfig, AgentContext, AgentResult, RoutingDecision, ActionType } from "./types";

const SUPERVISOR_SYSTEM_PROMPT = `You are a supervisor agent for an insurance claims management system. Your role is to:

1. Understand the user's natural language query
2. Determine which specialized agent should handle the request
3. Extract relevant parameters from the query

Available specialized agents:
- claims_triage: Classifies claim severity, assesses damage, and scores priority
- backlog_analysis: Analyzes claims queue metrics, identifies bottlenecks, and forecasts throughput
- adjuster_management: Optimizes adjuster assignments, balances workloads, and matches specialties to claims
- storm_assessment: Analyzes storm impacts, estimates losses, clusters claims by storm event

Respond with a JSON object containing:
{
  "targetAgent": "claims_triage" | "backlog_analysis" | "adjuster_management" | "storm_assessment",
  "action": "triage_claim" | "analyze_backlog" | "manage_adjusters" | "assess_storm" | "query_response",
  "context": { extracted parameters },
  "confidence": 0.0-1.0
}

If the query doesn't match any specialized agent, set targetAgent to "none" and provide a helpful response.`;

export class SupervisorAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: "supervisor-main",
      type: "supervisor",
      systemPrompt: SUPERVISOR_SYSTEM_PROMPT,
      allowedActions: ["query_response", "triage_claim", "analyze_backlog", "manage_adjusters", "assess_storm"],
      defaultTrustLevel: "guided",
      maxTokens: 1000,
    };
    super(config);
  }

  async routeQuery(userQuery: string): Promise<RoutingDecision> {
    const { content } = await this.callLLM(
      SUPERVISOR_SYSTEM_PROMPT,
      `User query: "${userQuery}"\n\nAnalyze this query and determine the appropriate routing.`
    );

    try {
      const parsed = JSON.parse(content);
      return {
        targetAgent: parsed.targetAgent || "supervisor",
        action: parsed.action || "query_response",
        context: parsed.context || {},
        confidence: parsed.confidence || 0.5,
      };
    } catch {
      return this.keywordRouting(userQuery);
    }
  }

  private keywordRouting(query: string): RoutingDecision {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes("claim") || lowerQuery.includes("triage") || lowerQuery.includes("severity") || lowerQuery.includes("damage")) {
      return {
        targetAgent: "claims_triage",
        action: "triage_claim",
        context: {},
        confidence: 0.7,
      };
    }

    if (lowerQuery.includes("backlog") || lowerQuery.includes("queue") || lowerQuery.includes("unassigned") || lowerQuery.includes("throughput")) {
      return {
        targetAgent: "backlog_analysis",
        action: "analyze_backlog",
        context: {},
        confidence: 0.7,
      };
    }

    if (lowerQuery.includes("adjuster") || lowerQuery.includes("workload") || lowerQuery.includes("assign") || lowerQuery.includes("specialty")) {
      return {
        targetAgent: "adjuster_management",
        action: "manage_adjusters",
        context: {},
        confidence: 0.7,
      };
    }

    if (lowerQuery.includes("storm") || lowerQuery.includes("hurricane") || lowerQuery.includes("weather") || lowerQuery.includes("catastrophe")) {
      return {
        targetAgent: "storm_assessment",
        action: "assess_storm",
        context: {},
        confidence: 0.7,
      };
    }

    return {
      targetAgent: "supervisor",
      action: "query_response",
      context: {},
      confidence: 0.5,
    };
  }

  protected async executeAction(
    context: AgentContext,
    action: ActionType,
    payload: unknown
  ): Promise<AgentResult> {
    if (action === "query_response") {
      const { content, tokenUsage } = await this.callLLM(
        `You are a helpful insurance claims management assistant. Answer questions about claims processing, 
        adjuster management, and insurance operations. Be concise and professional.`,
        context.userQuery
      );

      return {
        success: true,
        action,
        data: { response: content },
        confidenceScore: 0.8,
        tokenUsage,
      };
    }

    return {
      success: false,
      action,
      error: "Supervisor cannot execute specialized actions directly",
      confidenceScore: 0,
    };
  }
}

export const supervisorAgent = new SupervisorAgent();
