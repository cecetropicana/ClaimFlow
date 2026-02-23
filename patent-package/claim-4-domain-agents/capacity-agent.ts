import { BaseAgent } from "../base-agent";
import { actionHandler } from "../action-handler";
import type { AgentConfig, AgentContext, AgentResult, ActionType } from "../types";

const CAPACITY_CHECK_PROMPT = `You are a capacity checking agent for utility grid planning.
You evaluate the feasibility of new connections and capacity additions.

When checking capacity:
1. Assess current utilization
2. Evaluate available headroom
3. Identify upgrade requirements
4. Calculate connection costs

Provide feasibility analysis with clear recommendations.
Include specific substation and feeder references when available.`;

export class CapacityCheckAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: "capacity-check-agent",
      type: "capacity_check",
      systemPrompt: CAPACITY_CHECK_PROMPT,
      allowedActions: ["check_capacity"],
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
    if (action !== "check_capacity") {
      return {
        success: false,
        action,
        error: "Capacity agent can only check capacity",
        confidenceScore: 0,
      };
    }

    const capacityPayload = payload as { 
      capacityMw?: number; 
      latitude?: number;
      longitude?: number;
      substationId?: string;
      customerId?: string;
    };

    const { content, tokenUsage } = await this.callLLM(
      CAPACITY_CHECK_PROMPT,
      `Check capacity for: ${JSON.stringify(capacityPayload)}\n\nUser context: ${context.userQuery}`
    );

    const actionsExecuted: string[] = [];
    const capacityMw = capacityPayload.capacityMw || 10;

    await actionHandler.logEvent(this.config.id, {
      eventType: "decision",
      category: "capacity",
      title: `Capacity Check: ${capacityMw} MW Request`,
      description: `Capacity feasibility check for ${capacityMw} MW at location (${capacityPayload.latitude}, ${capacityPayload.longitude})`,
      severity: capacityMw > 50 ? "warning" : "info",
      relatedAssetId: capacityPayload.substationId,
      relatedAssetType: "substation",
      metadata: { 
        payload: capacityPayload,
        customerId: capacityPayload.customerId
      }
    });
    actionsExecuted.push("logged_event");

    if (capacityMw > 25) {
      await actionHandler.createAlert(this.config.id, {
        alertType: "info",
        title: `Large Capacity Request: ${capacityMw} MW`,
        message: `Capacity check requested for ${capacityMw} MW. Location: (${capacityPayload.latitude?.toFixed(4)}, ${capacityPayload.longitude?.toFixed(4)}). Assessment in progress.`,
        severity: capacityMw > 75 ? "high" : "medium",
        relatedAssetId: capacityPayload.substationId,
        relatedAssetType: "substation",
        metadata: { 
          capacityMw,
          location: { lat: capacityPayload.latitude, lng: capacityPayload.longitude }
        }
      });
      actionsExecuted.push("created_alert");
    }

    if (capacityMw > 50) {
      await actionHandler.updateAssetStatus(this.config.id, {
        assetId: capacityPayload.substationId || `sub-${Math.random().toString(36).substring(7)}`,
        assetType: "substation",
        assetName: `Serving Substation`,
        previousStatus: "operational",
        newStatus: "under_review",
        reason: `Capacity check for ${capacityMw} MW connection request`,
        needsInspection: true,
        inspectionPriority: capacityMw > 75 ? "high" : "normal",
        metadata: { capacityRequest: capacityMw }
      });
      actionsExecuted.push("updated_asset_status");

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      await actionHandler.createWorkOrder(this.config.id, {
        title: `Capacity Inspection: ${capacityMw} MW Request`,
        description: `Field inspection required to verify capacity availability for ${capacityMw} MW connection`,
        workType: "inspection",
        priority: capacityMw > 75 ? "high" : "normal",
        assetId: capacityPayload.substationId,
        assetType: "substation",
        assignedTeam: "Field Operations",
        estimatedHours: 4,
        dueDate,
        notes: `Customer connection request. Location: (${capacityPayload.latitude}, ${capacityPayload.longitude})`
      });
      actionsExecuted.push("created_work_order");
    }

    await actionHandler.sendNotification(this.config.id, {
      notificationType: "in_app",
      recipient: "capacity-planning",
      subject: `Capacity Check Complete: ${capacityMw} MW`,
      message: `Capacity assessment completed for ${capacityMw} MW request. ${actionsExecuted.length} actions taken.`,
      priority: capacityMw > 50 ? "high" : "normal"
    });
    actionsExecuted.push("sent_notification");

    return {
      success: true,
      action,
      data: {
        assessment: content,
        requestedCapacity: capacityPayload.capacityMw,
        location: {
          latitude: capacityPayload.latitude,
          longitude: capacityPayload.longitude,
        },
        timestamp: new Date().toISOString(),
        actionsExecuted,
      },
      confidenceScore: 0.75,
      tokenUsage,
    };
  }
}

export const capacityCheckAgent = new CapacityCheckAgent();
