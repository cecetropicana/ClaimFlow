import { BaseAgent } from "../base-agent";
import { actionHandler } from "../action-handler";
import type { AgentConfig, AgentContext, AgentResult, ActionType } from "../types";

const GRID_TOPOLOGY_PROMPT = `You are a grid topology agent for utility network analysis.
You trace network connectivity and analyze upstream/downstream relationships.

When tracing networks:
1. Identify connected assets
2. Map power flow paths
3. Determine circuit dependencies
4. Highlight critical interconnections

Provide clear topological analysis with path information.
Include specific asset IDs, feeder names, and connection details.`;

export class GridTopologyAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: "grid-topology-agent",
      type: "grid_topology",
      systemPrompt: GRID_TOPOLOGY_PROMPT,
      allowedActions: ["trace_network"],
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
    if (action !== "trace_network") {
      return {
        success: false,
        action,
        error: "Grid topology agent can only trace networks",
        confidenceScore: 0,
      };
    }

    const tracePayload = payload as { 
      assetId?: string; 
      direction?: string;
      assetType?: string;
      assetName?: string;
    };

    const { content, tokenUsage } = await this.callLLM(
      GRID_TOPOLOGY_PROMPT,
      `Trace network for: ${JSON.stringify(tracePayload)}\n\nUser context: ${context.userQuery}`
    );

    const actionsExecuted: string[] = [];
    const direction = tracePayload.direction || "downstream";

    await actionHandler.logEvent(this.config.id, {
      eventType: "observation",
      category: "topology",
      title: `Network Trace: ${tracePayload.assetId || "Asset"}`,
      description: `${direction.charAt(0).toUpperCase() + direction.slice(1)} trace from ${tracePayload.assetId || "starting point"}`,
      severity: "info",
      relatedAssetId: tracePayload.assetId,
      relatedAssetType: tracePayload.assetType || "asset",
      metadata: { 
        direction,
        userQuery: context.userQuery
      }
    });
    actionsExecuted.push("logged_event");

    if (tracePayload.assetId) {
      await actionHandler.updateAssetStatus(this.config.id, {
        assetId: tracePayload.assetId,
        assetType: tracePayload.assetType || "asset",
        assetName: tracePayload.assetName,
        previousStatus: "unknown",
        newStatus: "verified",
        reason: `Connectivity verified via ${direction} network trace`,
        needsInspection: false,
        metadata: { 
          traceDirection: direction,
          tracedAt: new Date().toISOString()
        }
      });
      actionsExecuted.push("updated_asset_status");
    }

    if (context.userQuery.toLowerCase().includes("issue") ||
        context.userQuery.toLowerCase().includes("problem") ||
        context.userQuery.toLowerCase().includes("fault")) {
      await actionHandler.createAlert(this.config.id, {
        alertType: "warning",
        title: `Network Issue Investigation: ${tracePayload.assetId || "Asset"}`,
        message: `Network trace performed to investigate reported issue. ${direction} analysis completed.`,
        severity: "medium",
        relatedAssetId: tracePayload.assetId,
        relatedAssetType: tracePayload.assetType || "asset",
        metadata: { direction, trace: content.substring(0, 500) }
      });
      actionsExecuted.push("created_alert");

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);

      await actionHandler.createWorkOrder(this.config.id, {
        title: `Network Issue Follow-up: ${tracePayload.assetId || "Asset"}`,
        description: `Follow-up inspection for network issue identified during trace analysis`,
        workType: "inspection",
        priority: "normal",
        assetId: tracePayload.assetId,
        assetType: tracePayload.assetType || "asset",
        assetName: tracePayload.assetName,
        assignedTeam: "Network Operations",
        estimatedHours: 2,
        dueDate,
        notes: `Triggered by network trace investigation. Direction: ${direction}`
      });
      actionsExecuted.push("created_work_order");

      await actionHandler.sendNotification(this.config.id, {
        notificationType: "in_app",
        recipient: "network-ops",
        subject: `Network Issue Alert: ${tracePayload.assetId}`,
        message: `Network trace completed for issue investigation at ${tracePayload.assetId}. Work order created for follow-up.`,
        priority: "normal"
      });
      actionsExecuted.push("sent_notification");
    }

    return {
      success: true,
      action,
      data: {
        trace: content,
        assetId: tracePayload.assetId,
        direction,
        timestamp: new Date().toISOString(),
        actionsExecuted,
      },
      confidenceScore: 0.85,
      tokenUsage,
    };
  }
}

export const gridTopologyAgent = new GridTopologyAgent();
