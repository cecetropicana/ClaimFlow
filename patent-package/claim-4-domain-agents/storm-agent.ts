import { BaseAgent } from "../base-agent";
import { actionHandler } from "../action-handler";
import type { AgentConfig, AgentContext, AgentResult, ActionType } from "../types";

const STORM_SYSTEM_PROMPT = `You are a storm resilience analysis agent for utility grid planning. 
You analyze weather event impacts, assess grid vulnerability, and provide recommendations.

When analyzing storm resilience:
1. Evaluate weather patterns and severity
2. Identify vulnerable infrastructure
3. Assess potential outage impacts
4. Recommend mitigation strategies

Provide structured analysis with risk levels (CRITICAL, HIGH, MEDIUM, LOW).
Include specific asset IDs and names when available.`;

export class StormResilienceAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: "storm-resilience-agent",
      type: "storm_resilience",
      systemPrompt: STORM_SYSTEM_PROMPT,
      allowedActions: ["analyze_storm_resilience"],
      defaultTrustLevel: "guided",
      maxTokens: 2000,
    };
    super(config);
  }

  protected async executeAction(
    context: AgentContext,
    action: ActionType,
    payload: unknown
  ): Promise<AgentResult> {
    if (action !== "analyze_storm_resilience") {
      return {
        success: false,
        action,
        error: "Storm agent can only analyze storm resilience",
        confidenceScore: 0,
      };
    }

    const analysisPayload = payload as { region?: string; stormId?: string; severity?: string };
    
    const { content, tokenUsage } = await this.callLLM(
      STORM_SYSTEM_PROMPT,
      `Analyze storm resilience for: ${JSON.stringify(analysisPayload)}\n\nUser context: ${context.userQuery}`
    );

    const actionsExecuted: string[] = [];

    await actionHandler.logEvent(this.config.id, {
      eventType: "analysis",
      category: "storm",
      title: `Storm Analysis: ${analysisPayload.region || "Region"}`,
      description: `Analyzed storm resilience for ${analysisPayload.region || "default region"}. ${analysisPayload.stormId ? `Storm ID: ${analysisPayload.stormId}` : ""}`,
      severity: "info",
      metadata: { payload: analysisPayload, userQuery: context.userQuery }
    });
    actionsExecuted.push("logged_event");

    const severity = analysisPayload.severity || "medium";
    if (severity === "high" || severity === "critical") {
      await actionHandler.createAlert(this.config.id, {
        alertType: "warning",
        title: `Storm Alert: ${analysisPayload.region || "Region"}`,
        message: `${severity.toUpperCase()} severity storm detected. Immediate action recommended. ${content.substring(0, 200)}...`,
        severity: severity === "critical" ? "critical" : "high",
        relatedAssetType: "region",
        relatedAssetId: analysisPayload.region || "default",
        metadata: { stormId: analysisPayload.stormId }
      });
      actionsExecuted.push("created_alert");

      await actionHandler.sendNotification(this.config.id, {
        notificationType: "in_app",
        recipient: "grid-operations",
        subject: `Storm Alert: ${severity.toUpperCase()} severity`,
        message: `Storm analysis indicates ${severity} severity conditions in ${analysisPayload.region || "region"}. Review recommended actions.`,
        priority: severity === "critical" ? "urgent" : "high"
      });
      actionsExecuted.push("sent_notification");
    }

    if (context.userQuery.toLowerCase().includes("maintenance") || 
        context.userQuery.toLowerCase().includes("prepare") ||
        severity === "critical") {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() + 2);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 8);

      await actionHandler.scheduleMaintenance(this.config.id, {
        title: `Pre-Storm Inspection: ${analysisPayload.region || "Region"}`,
        description: `Pre-storm inspection and preparation for expected weather event`,
        assetId: analysisPayload.region || "region-default",
        assetType: "region",
        assetName: analysisPayload.region || "Default Region",
        maintenanceType: "preventive",
        priority: severity === "critical" ? "urgent" : "high",
        scheduledStart: startDate,
        scheduledEnd: endDate,
        notes: `Triggered by storm analysis. Severity: ${severity}`
      });
      actionsExecuted.push("scheduled_maintenance");
    }

    return {
      success: true,
      action,
      data: {
        analysis: content,
        region: analysisPayload.region || "default",
        timestamp: new Date().toISOString(),
        actionsExecuted,
      },
      confidenceScore: 0.85,
      tokenUsage,
    };
  }
}

export const stormResilienceAgent = new StormResilienceAgent();
