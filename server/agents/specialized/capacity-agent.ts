import { BaseAgent } from "../base-agent";
import { actionHandler } from "../action-handler";
import type { AgentConfig, AgentContext, AgentResult, ActionType } from "../types";

const STORM_ASSESSMENT_PROMPT = `You are a storm assessment agent for insurance claims management.
You analyze storm impacts, estimate losses, cluster claims by storm event, and recommend response levels.

When assessing storms:
1. Evaluate storm severity and affected areas
2. Estimate potential losses and claim volumes
3. Cluster claims by storm event
4. Recommend response levels and resource deployment

Provide detailed storm impact analysis with loss estimates.
Include specific storm IDs, regions, and severity classifications when available.`;

export class CapacityCheckAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: "storm-assessment-agent",
      type: "storm_assessment",
      systemPrompt: STORM_ASSESSMENT_PROMPT,
      allowedActions: ["assess_storm"],
      defaultTrustLevel: "supervised",
      maxTokens: 2000,
    };
    super(config);
  }

  protected async executeAction(
    context: AgentContext,
    action: ActionType,
    payload: unknown
  ): Promise<AgentResult> {
    if (action !== "assess_storm") {
      return {
        success: false,
        action,
        error: "Storm assessment agent can only assess storms",
        confidenceScore: 0,
      };
    }

    const stormPayload = payload as { 
      stormId?: string; 
      region?: string;
      category?: string;
      severity?: string;
    };

    const { content, tokenUsage } = await this.callLLM(
      STORM_ASSESSMENT_PROMPT,
      `Assess storm impact for: ${JSON.stringify(stormPayload)}\n\nUser context: ${context.userQuery}`
    );

    const actionsExecuted: string[] = [];
    const severity = stormPayload.severity || "moderate";

    await actionHandler.logEvent(this.config.id, {
      eventType: "decision",
      category: "storm",
      title: `Storm Assessment: ${stormPayload.region || "Region"}`,
      description: `Storm impact assessment for ${stormPayload.region || "region"}. ${stormPayload.stormId ? `Storm ID: ${stormPayload.stormId}` : ""} Category: ${stormPayload.category || "unknown"}`,
      severity: severity === "critical" || severity === "high" ? "warning" : "info",
      metadata: { 
        payload: stormPayload
      }
    });
    actionsExecuted.push("logged_event");

    if (severity === "high" || severity === "critical" || stormPayload.category === "major") {
      await actionHandler.createAlert(this.config.id, {
        alertType: "warning",
        title: `Major Storm Event: ${stormPayload.region || "Region"}`,
        message: `Storm assessment indicates ${severity} severity impact in ${stormPayload.region || "region"}. Estimated high claim volume. ${content.substring(0, 150)}...`,
        severity: severity === "critical" ? "critical" : "high",
        relatedAssetId: stormPayload.stormId,
        relatedAssetType: "storm",
        metadata: { 
          category: stormPayload.category,
          region: stormPayload.region
        }
      });
      actionsExecuted.push("created_alert");
    }

    if (severity === "high" || severity === "critical") {
      await actionHandler.updateAssetStatus(this.config.id, {
        assetId: stormPayload.stormId || `storm-${Math.random().toString(36).substring(7)}`,
        assetType: "storm",
        assetName: `Storm Event: ${stormPayload.region || "Region"}`,
        previousStatus: "monitoring",
        newStatus: "active_response",
        reason: `Storm assessment: ${severity} severity impact`,
        needsInspection: true,
        inspectionPriority: severity === "critical" ? "high" : "normal",
        metadata: { category: stormPayload.category }
      });
      actionsExecuted.push("updated_asset_status");

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      await actionHandler.createWorkOrder(this.config.id, {
        title: `Storm Response: ${stormPayload.region || "Region"}`,
        description: `Deploy storm response team for ${severity} severity event in ${stormPayload.region || "region"}`,
        workType: "inspection",
        priority: severity === "critical" ? "high" : "normal",
        assetId: stormPayload.stormId,
        assetType: "storm",
        assignedTeam: "Storm Response",
        estimatedHours: 40,
        dueDate,
        notes: `Storm category: ${stormPayload.category || "unknown"}. Region: ${stormPayload.region || "unspecified"}`
      });
      actionsExecuted.push("created_work_order");
    }

    await actionHandler.sendNotification(this.config.id, {
      notificationType: "in_app",
      recipient: "storm-response",
      subject: `Storm Assessment Complete: ${stormPayload.region || "Region"}`,
      message: `Storm impact assessment completed for ${stormPayload.region || "region"}. ${actionsExecuted.length} actions taken.`,
      priority: severity === "critical" || severity === "high" ? "high" : "normal"
    });
    actionsExecuted.push("sent_notification");

    return {
      success: true,
      action,
      data: {
        assessment: content,
        stormId: stormPayload.stormId,
        region: stormPayload.region,
        category: stormPayload.category,
        timestamp: new Date().toISOString(),
        actionsExecuted,
      },
      confidenceScore: 0.75,
      tokenUsage,
    };
  }
}

export const capacityCheckAgent = new CapacityCheckAgent();
