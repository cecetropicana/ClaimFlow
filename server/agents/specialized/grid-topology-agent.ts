import { BaseAgent } from "../base-agent";
import { actionHandler } from "../action-handler";
import type { AgentConfig, AgentContext, AgentResult, ActionType } from "../types";

const ADJUSTER_MANAGEMENT_PROMPT = `You are an adjuster management agent for insurance claims management.
You optimize adjuster assignments, balance workloads, and match specialties to claims.

When managing adjusters:
1. Evaluate adjuster availability and current workload
2. Match adjuster specialties to claim types
3. Balance workload distribution across regions
4. Recommend optimal assignment strategies

Provide clear workload analysis with assignment recommendations.
Include specific adjuster IDs, regions, and specialty details when available.`;

export class GridTopologyAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: "adjuster-management-agent",
      type: "adjuster_management",
      systemPrompt: ADJUSTER_MANAGEMENT_PROMPT,
      allowedActions: ["manage_adjusters"],
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
    if (action !== "manage_adjusters") {
      return {
        success: false,
        action,
        error: "Adjuster management agent can only manage adjusters",
        confidenceScore: 0,
      };
    }

    const adjusterPayload = payload as { 
      adjusterId?: string; 
      region?: string;
      specialty?: string;
      claimCount?: number;
    };

    const { content, tokenUsage } = await this.callLLM(
      ADJUSTER_MANAGEMENT_PROMPT,
      `Manage adjuster assignments for: ${JSON.stringify(adjusterPayload)}\n\nUser context: ${context.userQuery}`
    );

    const actionsExecuted: string[] = [];

    await actionHandler.logEvent(this.config.id, {
      eventType: "observation",
      category: "adjuster",
      title: `Adjuster Management: ${adjusterPayload.region || "All Regions"}`,
      description: `Adjuster workload analysis for ${adjusterPayload.region || "all regions"}. ${adjusterPayload.adjusterId ? `Adjuster: ${adjusterPayload.adjusterId}` : ""}`,
      severity: "info",
      metadata: { 
        payload: adjusterPayload,
        userQuery: context.userQuery
      }
    });
    actionsExecuted.push("logged_event");

    if (adjusterPayload.adjusterId) {
      await actionHandler.updateAssetStatus(this.config.id, {
        assetId: adjusterPayload.adjusterId,
        assetType: "adjuster",
        assetName: adjusterPayload.adjusterId,
        previousStatus: "unknown",
        newStatus: "active",
        reason: `Availability verified via workload analysis`,
        needsInspection: false,
        metadata: { 
          specialty: adjusterPayload.specialty,
          verifiedAt: new Date().toISOString()
        }
      });
      actionsExecuted.push("updated_asset_status");
    }

    if (context.userQuery.toLowerCase().includes("overload") ||
        context.userQuery.toLowerCase().includes("shortage") ||
        context.userQuery.toLowerCase().includes("imbalance")) {
      await actionHandler.createAlert(this.config.id, {
        alertType: "warning",
        title: `Adjuster Workload Issue: ${adjusterPayload.region || "Region"}`,
        message: `Adjuster workload analysis detected potential issues. Review assignment distribution.`,
        severity: "medium",
        relatedAssetId: adjusterPayload.adjusterId,
        relatedAssetType: "adjuster",
        metadata: { region: adjusterPayload.region }
      });
      actionsExecuted.push("created_alert");

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      await actionHandler.createWorkOrder(this.config.id, {
        title: `Adjuster Rebalancing: ${adjusterPayload.region || "Region"}`,
        description: `Workload rebalancing needed for adjusters in ${adjusterPayload.region || "region"}`,
        workType: "inspection",
        priority: "normal",
        assetId: adjusterPayload.adjusterId,
        assetType: "adjuster",
        assetName: adjusterPayload.adjusterId,
        assignedTeam: "Claims Management",
        estimatedHours: 2,
        dueDate,
        notes: `Triggered by adjuster workload analysis`
      });
      actionsExecuted.push("created_work_order");

      await actionHandler.sendNotification(this.config.id, {
        notificationType: "in_app",
        recipient: "adjuster-ops",
        subject: `Adjuster Workload Alert: ${adjusterPayload.region || "Region"}`,
        message: `Adjuster workload analysis completed for ${adjusterPayload.region || "region"}. Work order created for rebalancing.`,
        priority: "normal"
      });
      actionsExecuted.push("sent_notification");
    }

    return {
      success: true,
      action,
      data: {
        analysis: content,
        adjusterId: adjusterPayload.adjusterId,
        region: adjusterPayload.region,
        timestamp: new Date().toISOString(),
        actionsExecuted,
      },
      confidenceScore: 0.85,
      tokenUsage,
    };
  }
}

export const gridTopologyAgent = new GridTopologyAgent();
