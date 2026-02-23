import { BaseAgent } from "../base-agent";
import { actionHandler } from "../action-handler";
import type { AgentConfig, AgentContext, AgentResult, ActionType } from "../types";

const BACKLOG_ANALYSIS_PROMPT = `You are a backlog analysis agent for insurance claims management.
You analyze claims queue metrics, identify bottlenecks, and forecast throughput.

When analyzing backlog:
1. Evaluate queue depth and aging metrics
2. Identify processing bottlenecks
3. Forecast throughput and resolution times
4. Recommend resource allocation adjustments

Provide analysis with queue statistics and actionable recommendations.
Include specific regions and severity breakdowns when available.`;

export class LoadForecastAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: "backlog-analysis-agent",
      type: "backlog_analysis",
      systemPrompt: BACKLOG_ANALYSIS_PROMPT,
      allowedActions: ["analyze_backlog"],
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
    if (action !== "analyze_backlog") {
      return {
        success: false,
        action,
        error: "Backlog analysis agent can only analyze backlog",
        confidenceScore: 0,
      };
    }

    const backlogPayload = payload as { 
      region?: string; 
      stormEventId?: string;
      timeRange?: string;
      severity?: string;
    };

    const { content, tokenUsage } = await this.callLLM(
      BACKLOG_ANALYSIS_PROMPT,
      `Analyze claims backlog for: ${JSON.stringify(backlogPayload)}\n\nUser context: ${context.userQuery}`
    );

    const actionsExecuted: string[] = [];

    await actionHandler.logEvent(this.config.id, {
      eventType: "observation",
      category: "backlog",
      title: `Backlog Analysis: ${backlogPayload.region || "All Regions"}`,
      description: `Claims backlog analysis for ${backlogPayload.region || "all regions"}. Time range: ${backlogPayload.timeRange || "current"}`,
      severity: "info",
      metadata: { payload: backlogPayload }
    });
    actionsExecuted.push("logged_event");

    const severity = backlogPayload.severity || "normal";
    if (severity === "high" || severity === "critical") {
      await actionHandler.createAlert(this.config.id, {
        alertType: "info",
        title: `High Unassigned Claims: ${backlogPayload.region || "All Regions"}`,
        message: `Claims backlog has reached ${severity} levels in ${backlogPayload.region || "multiple regions"}. ${content.substring(0, 150)}...`,
        severity: severity === "critical" ? "high" : "medium",
        relatedAssetType: "queue",
        metadata: { region: backlogPayload.region, stormEventId: backlogPayload.stormEventId }
      });
      actionsExecuted.push("created_alert");
    }

    if (context.userQuery.toLowerCase().includes("critical") ||
        context.userQuery.toLowerCase().includes("urgent")) {
      await actionHandler.sendNotification(this.config.id, {
        notificationType: "in_app",
        recipient: "claims-management",
        subject: `Backlog Analysis Alert`,
        message: `Urgent backlog analysis completed for ${backlogPayload.region || "all regions"}. Review required.`,
        priority: "high"
      });
      actionsExecuted.push("sent_notification");
    }

    return {
      success: true,
      action,
      data: {
        analysis: content,
        region: backlogPayload.region || "all",
        timeRange: backlogPayload.timeRange || "current",
        timestamp: new Date().toISOString(),
        actionsExecuted,
      },
      confidenceScore: 0.8,
      tokenUsage,
    };
  }
}

export const loadForecastAgent = new LoadForecastAgent();
