import { BaseAgent } from "../base-agent";
import { actionHandler } from "../action-handler";
import type { AgentConfig, AgentContext, AgentResult, ActionType } from "../types";

const LOAD_FORECAST_PROMPT = `You are a load forecasting agent for utility grid planning.
You project energy demand and generate forecasts for grid planning.

When forecasting:
1. Analyze historical load patterns
2. Consider seasonal variations
3. Account for growth trends
4. Factor in economic indicators

Provide forecasts with confidence intervals and scenario analysis.
Include specific substation and asset references when available.`;

export class LoadForecastAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: "load-forecast-agent",
      type: "load_forecast",
      systemPrompt: LOAD_FORECAST_PROMPT,
      allowedActions: ["forecast_load", "datacenter_impact"],
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
    if (action !== "forecast_load" && action !== "datacenter_impact") {
      return {
        success: false,
        action,
        error: "Load forecast agent can only forecast load or analyze datacenter impact",
        confidenceScore: 0,
      };
    }

    const forecastPayload = payload as { 
      nodeId?: string; 
      horizon?: string;
      capacityMw?: number;
      region?: string;
    };

    const { content, tokenUsage } = await this.callLLM(
      LOAD_FORECAST_PROMPT,
      `${action === "datacenter_impact" ? "Analyze data center impact" : "Generate load forecast"} for: ${JSON.stringify(forecastPayload)}\n\nUser context: ${context.userQuery}`
    );

    const actionsExecuted: string[] = [];

    await actionHandler.logEvent(this.config.id, {
      eventType: action === "datacenter_impact" ? "decision" : "observation",
      category: "load",
      title: action === "datacenter_impact" 
        ? `Data Center Impact: ${forecastPayload.region || forecastPayload.nodeId || "Analysis"}`
        : `Load Forecast: ${forecastPayload.nodeId || "Grid"}`,
      description: `${action === "datacenter_impact" ? "Data center impact analysis" : "Load forecast"} for ${forecastPayload.nodeId || "grid"}. Horizon: ${forecastPayload.horizon || "10 years"}`,
      severity: "info",
      relatedAssetId: forecastPayload.nodeId,
      relatedAssetType: "substation",
      metadata: { payload: forecastPayload }
    });
    actionsExecuted.push("logged_event");

    if (action === "datacenter_impact") {
      const capacityMw = forecastPayload.capacityMw || 100;
      
      if (capacityMw > 50) {
        await actionHandler.createAlert(this.config.id, {
          alertType: "info",
          title: `High Capacity Request: ${capacityMw} MW`,
          message: `Data center capacity request of ${capacityMw} MW requires grid assessment. ${content.substring(0, 150)}...`,
          severity: capacityMw > 100 ? "high" : "medium",
          relatedAssetId: forecastPayload.nodeId,
          relatedAssetType: "substation",
          metadata: { capacityMw, region: forecastPayload.region }
        });
        actionsExecuted.push("created_alert");
      }

      if (capacityMw > 100) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        await actionHandler.createWorkOrder(this.config.id, {
          title: `Capacity Upgrade Study: ${forecastPayload.region || forecastPayload.nodeId}`,
          description: `Engineering study required for ${capacityMw} MW data center connection`,
          workType: "upgrade",
          priority: "high",
          assetId: forecastPayload.nodeId,
          assetType: "substation",
          assignedTeam: "Engineering",
          estimatedHours: 40,
          dueDate,
          notes: `Triggered by data center impact analysis. Requested capacity: ${capacityMw} MW`
        });
        actionsExecuted.push("created_work_order");
      }
    }

    if (context.userQuery.toLowerCase().includes("critical") ||
        context.userQuery.toLowerCase().includes("urgent")) {
      await actionHandler.sendNotification(this.config.id, {
        notificationType: "in_app",
        recipient: "planning-team",
        subject: `Load Forecast Alert`,
        message: `Urgent load forecast analysis completed for ${forecastPayload.nodeId || "grid"}. Review required.`,
        priority: "high"
      });
      actionsExecuted.push("sent_notification");
    }

    return {
      success: true,
      action,
      data: {
        forecast: content,
        nodeId: forecastPayload.nodeId || "default",
        horizon: forecastPayload.horizon || "P10Y",
        timestamp: new Date().toISOString(),
        actionsExecuted,
      },
      confidenceScore: 0.8,
      tokenUsage,
    };
  }
}

export const loadForecastAgent = new LoadForecastAgent();
