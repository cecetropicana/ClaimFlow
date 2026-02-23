import OpenAI from "openai";
import { db } from "../db";
import { auditLogs, agentMetrics } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { AgentConfig, AgentContext, AgentResult, GovernanceDecision, ActionType } from "./types";
import { averecionClient } from "./averecion-client";
import { agentCache, CACHE_TTL } from "./cache";
import { getDeterministicFallback, shouldUseFallback, enhanceFallbackWithContext } from "./fallbacks";
import { autonomyTracker } from "./autonomy-tracker";

// Initialize OpenAI client using Replit AI Integrations
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected openai: OpenAI;

  constructor(config: AgentConfig) {
    this.config = config;
    this.openai = openai;
  }

  // Main execution method with governance check
  async execute(context: AgentContext, action: ActionType, payload: unknown): Promise<AgentResult> {
    const correlationId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Check cache first for identical requests
      const cachedResult = agentCache.get<AgentResult>(context.agentId, action, payload);
      if (cachedResult) {
        console.log(`[${this.config.id}] Cache hit for ${action}`);
        return {
          ...cachedResult,
          latencyMs: Date.now() - startTime,
        };
      }

      // For high-risk actions, request options from Averecion before governance check
      let selectedOption: string | undefined;
      if (averecionClient.isHighRiskAction(action)) {
        const optionsResult = await this.handleHighRiskAction(context, action, payload);
        if (optionsResult.blocked) {
          return {
            success: false,
            action,
            error: optionsResult.reason || "High-risk action requires option selection",
            confidenceScore: 0,
            latencyMs: Date.now() - startTime,
            governanceStatus: "pending_review",
          };
        }
        selectedOption = optionsResult.selectedOption;
      }

      // Pre-execution governance check via Averecion
      const governanceDecision = await this.checkGovernance(context, action, payload);

      // Honor Averecion's action modification if provided
      const effectiveAction = governanceDecision.modifiedAction || action;

      if (!governanceDecision.approved) {
        // Add to approval queue for human review
        if (governanceDecision.requiresHumanReview) {
          await this.requestHumanApproval(correlationId, context, effectiveAction, payload);
        }

        // Create rejection result
        const rejectionResult: AgentResult = {
          success: false,
          action: effectiveAction,
          error: governanceDecision.reason || "Action not approved by governance",
          confidenceScore: 0,
          latencyMs: Date.now() - startTime,
        };

        // Always log rejected actions for audit trail (critical for governance)
        await this.logAction(correlationId, context, effectiveAction, payload, rejectionResult, "governance_rejected");

        return rejectionResult;
      }

      // Report decision telemetry to Averecion's Decision Inspector
      const alternatives = this.getAlternativeActions(effectiveAction);
      await averecionClient.reportDecision(
        context.agentId,
        effectiveAction,
        {
          task: this.getTaskDescription(effectiveAction),
          inputs: { query: context.userQuery, payload },
        },
        this.getDecisionRationale(effectiveAction, context),
        {
          confidence: 0.85,
          riskLevel: this.getRiskLevel(effectiveAction),
          alternatives,
        }
      );

      // Execute the action (using effective action which may be modified by Averecion)
      let result: AgentResult;
      try {
        result = await this.executeAction(context, effectiveAction, payload);
      } catch (error) {
        // Check if we should use a deterministic fallback
        if (shouldUseFallback(error)) {
          console.log(`[${this.config.id}] Using fallback for ${effectiveAction} due to:`, error);
          result = enhanceFallbackWithContext(
            getDeterministicFallback(effectiveAction),
            { userQuery: context.userQuery, agentId: context.agentId }
          );
        } else {
          throw error;
        }
      }

      // Apply any constraints from governance decision
      if (governanceDecision.constraints) {
        result.data = this.applyConstraints(result.data, governanceDecision.constraints);
      }

      // Cache successful results
      if (result.success) {
        const ttl = CACHE_TTL[effectiveAction] || CACHE_TTL.query_response;
        agentCache.set(context.agentId, effectiveAction, payload, result, ttl);
      }

      // Log the action for audit
      await this.logAction(correlationId, context, effectiveAction, payload, result, "executed");

      // Update agent metrics and track autonomy
      await this.updateMetrics(context.agentId, result.success);
      await autonomyTracker.recordOutcome(context.agentId, result.success);
      
      // Report outcome to Averecion
      await averecionClient.reportOutcome(
        context.agentId, 
        effectiveAction, 
        result.success, 
        result.confidenceScore || 1.0
      );

      return {
        ...result,
        action: effectiveAction,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      // Try fallback for unhandled errors as last resort
      if (shouldUseFallback(error)) {
        const fallbackResult = enhanceFallbackWithContext(
          getDeterministicFallback(action),
          { userQuery: context.userQuery, agentId: context.agentId }
        );
        await this.logAction(correlationId, context, action, payload, fallbackResult, "executed");
        return {
          ...fallbackResult,
          latencyMs: Date.now() - startTime,
        };
      }

      const errorResult: AgentResult = {
        success: false,
        action,
        error: error instanceof Error ? error.message : "Unknown error",
        confidenceScore: 0,
        latencyMs: Date.now() - startTime,
      };

      await this.logAction(correlationId, context, action, payload, errorResult, "error");
      await autonomyTracker.recordOutcome(context.agentId, false);
      return errorResult;
    }
  }

  // Apply constraints from governance decision to result data
  private applyConstraints(data: unknown, constraints: Record<string, unknown>): unknown {
    // For now, just attach constraints as metadata
    // Can be extended to filter/modify data based on constraint rules
    if (typeof data === "object" && data !== null) {
      return { ...data, _appliedConstraints: constraints };
    }
    return data;
  }

  // Check governance before execution
  private async checkGovernance(
    context: AgentContext,
    action: ActionType,
    payload: unknown
  ): Promise<GovernanceDecision> {
    // For supervised agents, always require approval for high-risk actions
    if (context.trustLevel === "supervised") {
      const highRiskActions: ActionType[] = ["datacenter_impact", "check_capacity"];
      
      if (highRiskActions.includes(action)) {
        return {
          approved: false,
          requiresHumanReview: true,
          reason: "Action requires human approval for supervised agents",
        };
      }
    }

    // Check with Averecion for governance decision
    try {
      return await averecionClient.checkAction(context, action, payload);
    } catch (error) {
      // If Averecion is unavailable, fail safe
      console.error("Averecion governance check failed:", error);
      return {
        approved: false,
        requiresHumanReview: true,
        reason: "Governance service unavailable - requires human approval",
      };
    }
  }

  // Abstract method for action execution - implemented by specialized agents
  protected abstract executeAction(
    context: AgentContext,
    action: ActionType,
    payload: unknown
  ): Promise<AgentResult>;

  // Request human approval
  private async requestHumanApproval(
    correlationId: string,
    context: AgentContext,
    action: ActionType,
    payload: unknown
  ): Promise<void> {
    const { approvalQueue } = await import("@shared/schema");
    await db.insert(approvalQueue).values({
      correlationId,
      agentId: context.agentId,
      action,
      context: JSON.stringify({ ...context, payload }),
      status: "pending",
    });
  }

  // Log action for audit trail (always called, even for rejections)
  private async logAction(
    correlationId: string,
    context: AgentContext,
    action: ActionType,
    input: unknown,
    result: AgentResult,
    decisionType: "executed" | "governance_rejected" | "error" = "executed"
  ): Promise<void> {
    await db.insert(auditLogs).values({
      correlationId,
      agentId: context.agentId,
      action,
      input: JSON.stringify(input),
      output: result.success ? JSON.stringify(result.data) : JSON.stringify({ error: result.error }),
      decision: decisionType,
      confidenceScore: result.confidenceScore,
      latencyMs: result.latencyMs,
      tokenUsage: result.tokenUsage,
    });
  }

  // Update agent metrics for trust calculation
  private async updateMetrics(agentId: string, success: boolean): Promise<void> {
    const [existing] = await db
      .select()
      .from(agentMetrics)
      .where(eq(agentMetrics.agentId, agentId));

    if (existing) {
      await db
        .update(agentMetrics)
        .set({
          totalDecisions: existing.totalDecisions + 1,
          successfulDecisions: success
            ? existing.successfulDecisions + 1
            : existing.successfulDecisions,
          trustScore: this.calculateTrustScore(
            existing.successfulDecisions + (success ? 1 : 0),
            existing.totalDecisions + 1
          ),
          lastActiveAt: new Date(),
        })
        .where(eq(agentMetrics.agentId, agentId));
    } else {
      await db.insert(agentMetrics).values({
        agentId,
        agentType: this.config.type,
        trustLevel: this.config.defaultTrustLevel,
        trustScore: success ? 1 : 0,
        totalDecisions: 1,
        successfulDecisions: success ? 1 : 0,
        lastActiveAt: new Date(),
      });
    }
  }

  // Calculate trust score based on success rate
  private calculateTrustScore(successes: number, total: number): number {
    if (total === 0) return 0;
    // Weighted average with recency bias
    return Math.min(1, (successes / total) * Math.min(1, total / 10));
  }

  // Helper to call OpenAI
  protected async callLLM(
    systemPrompt: string,
    userMessage: string,
    maxTokens?: number
  ): Promise<{ content: string; tokenUsage: number }> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: maxTokens || this.config.maxTokens,
      temperature: 0.7,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      tokenUsage: response.usage?.total_tokens || 0,
    };
  }

  // Get task description for decision telemetry
  private getTaskDescription(action: ActionType): string {
    const taskDescriptions: Record<string, string> = {
      query_response: "Respond to user query",
      datacenter_impact: "Analyze data center grid impact",
      analyze_storm_resilience: "Assess storm vulnerability and resilience",
      forecast_load: "Generate load demand forecast",
      trace_network: "Trace network connectivity",
      check_capacity: "Check capacity for new connections",
    };
    return taskDescriptions[action] || `Execute ${action}`;
  }

  // Get decision rationale based on action and context
  private getDecisionRationale(action: ActionType, context: AgentContext): string {
    const rationales: Record<string, string> = {
      query_response: "User query matches general information request pattern",
      datacenter_impact: "Query indicates data center infrastructure analysis needed",
      analyze_storm_resilience: "Weather-related keywords detected requiring resilience assessment",
      forecast_load: "Demand projection or load analysis requested",
      trace_network: "Network topology or connectivity analysis required",
      check_capacity: "Capacity feasibility check for new connection requested",
    };
    return rationales[action] || `Action ${action} selected based on query analysis`;
  }

  // Get risk level for action
  private getRiskLevel(action: ActionType): "low" | "medium" | "high" | "critical" {
    const riskLevels: Record<string, "low" | "medium" | "high" | "critical"> = {
      query_response: "low",
      forecast_load: "medium",
      trace_network: "medium",
      analyze_storm_resilience: "medium",
      datacenter_impact: "high",
      check_capacity: "high",
    };
    return riskLevels[action] || "medium";
  }

  // Handle high-risk actions by requesting options from Averecion
  private async handleHighRiskAction(
    context: AgentContext,
    action: ActionType,
    payload: unknown
  ): Promise<{
    blocked: boolean;
    selectedOption?: string;
    reason?: string;
  }> {
    const payloadData = payload as Record<string, unknown> || {};
    
    // Determine context details for options generation
    const actionContexts: Record<string, { goal: string; context: string; isIrreversible: boolean }> = {
      schedule_grid_downtime: {
        goal: "Schedule planned grid maintenance",
        context: `Affected area: ${payloadData.area || "unknown"}`,
        isIrreversible: false,
      },
      emergency_load_shed: {
        goal: "Emergency load reduction to prevent grid failure",
        context: `Load to shed: ${payloadData.load || "unknown"} MW`,
        isIrreversible: true,
      },
      disconnect_service: {
        goal: "Disconnect customer service",
        context: `Customer: ${payloadData.customerId || "unknown"}`,
        isIrreversible: false,
      },
      approve_large_expenditure: {
        goal: "Approve capital expenditure",
        context: `Amount: $${payloadData.amount || "unknown"}`,
        isIrreversible: true,
      },
      modify_rate_structure: {
        goal: "Modify rate structure",
        context: `Rate class: ${payloadData.rateClass || "unknown"}`,
        isIrreversible: true,
      },
      datacenter_impact: {
        goal: "Analyze data center grid impact",
        context: `Capacity: ${payloadData.capacity || context.userQuery}`,
        isIrreversible: false,
      },
      check_capacity: {
        goal: "Check capacity for new connection",
        context: `Request: ${context.userQuery}`,
        isIrreversible: false,
      },
    };

    const actionContext = actionContexts[action] || {
      goal: `Execute ${action}`,
      context: context.userQuery,
      isIrreversible: false,
    };

    // Request options from Averecion
    const optionsResult = await averecionClient.requestActionOptions(
      context.agentId,
      action,
      {
        goal: actionContext.goal,
        context: actionContext.context,
        riskLevel: this.getRiskLevel(action),
        isIrreversible: actionContext.isIrreversible,
        affectedEntities: payloadData.affectedCustomers as number || undefined,
      }
    );

    if (!optionsResult.success) {
      // If options generation fails, fall back to normal governance
      console.log(`[${this.config.id}] Options generation failed, proceeding with governance check`);
      return { blocked: false };
    }

    // If we have options and trust level is supervised, require human selection
    if (optionsResult.options && optionsResult.options.length > 0) {
      if (context.trustLevel === "supervised") {
        // Wait for human to select in dashboard (with timeout)
        console.log(`[${this.config.id}] Waiting for human selection from ${optionsResult.options.length} options`);
        
        if (optionsResult.optionsId) {
          const selectionResult = await averecionClient.waitForOptionSelection(
            optionsResult.optionsId,
            60000 // 1 minute timeout for now
          );

          if (selectionResult.success && selectionResult.selectedOptionId) {
            return { blocked: false, selectedOption: selectionResult.selectedOptionId };
          } else if (selectionResult.timedOut) {
            return { blocked: true, reason: "Waiting for human option selection (check Averecion dashboard)" };
          }
        }
        
        return { blocked: true, reason: "Options generated - awaiting selection in Averecion dashboard" };
      } else {
        // For guided/semi-autonomous, auto-select recommended option
        const recommended = optionsResult.options.find(o => o.recommended);
        if (recommended && optionsResult.optionsId) {
          await averecionClient.selectOption(
            context.agentId,
            optionsResult.optionsId,
            recommended.id,
            `Auto-selected recommended option for ${context.trustLevel} agent`
          );
          return { blocked: false, selectedOption: recommended.id };
        }
      }
    }

    return { blocked: false };
  }

  // Get alternative actions that were considered
  private getAlternativeActions(chosenAction: ActionType): Array<{
    action: string;
    confidence: number;
    reason_not_chosen: string;
  }> {
    const actionAlternatives: Record<string, Array<{ action: string; confidence: number; reason_not_chosen: string }>> = {
      analyze_storm_resilience: [
        { action: "query_response", confidence: 0.3, reason_not_chosen: "User query specifically mentions storm/weather analysis" },
        { action: "trace_network", confidence: 0.2, reason_not_chosen: "Storm assessment is more appropriate than topology analysis" },
      ],
      forecast_load: [
        { action: "query_response", confidence: 0.25, reason_not_chosen: "User explicitly requested forecast data" },
        { action: "check_capacity", confidence: 0.4, reason_not_chosen: "Load forecast is requested, not capacity check" },
      ],
      trace_network: [
        { action: "query_response", confidence: 0.2, reason_not_chosen: "Network trace specifically requested" },
      ],
      check_capacity: [
        { action: "forecast_load", confidence: 0.5, reason_not_chosen: "User asking about new connection, not existing load" },
        { action: "query_response", confidence: 0.15, reason_not_chosen: "Capacity analysis requires specialized processing" },
      ],
      datacenter_impact: [
        { action: "check_capacity", confidence: 0.6, reason_not_chosen: "Data center impact is broader than capacity check alone" },
        { action: "forecast_load", confidence: 0.4, reason_not_chosen: "Impact analysis includes more than load projection" },
      ],
    };
    return actionAlternatives[chosenAction] || [];
  }
}
