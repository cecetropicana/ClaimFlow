import { BaseAgent } from "../base-agent";
import { actionHandler } from "../action-handler";
import type { AgentConfig, AgentContext, AgentResult, ActionType } from "../types";

const CLAIMS_TRIAGE_PROMPT = `You are a claims triage agent for insurance claims management. 
You classify claim severity, assess damage, and score priority.

When triaging claims:
1. Evaluate damage reports and documentation
2. Classify severity (CRITICAL, HIGH, MEDIUM, LOW)
3. Assess damage type and extent
4. Score priority for adjuster assignment

Provide structured triage results with severity levels and priority scores.
Include specific claim IDs and regions when available.`;

export class StormResilienceAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      id: "claims-triage-agent",
      type: "claims_triage",
      systemPrompt: CLAIMS_TRIAGE_PROMPT,
      allowedActions: ["triage_claim"],
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
    if (action !== "triage_claim") {
      return {
        success: false,
        action,
        error: "Claims triage agent can only triage claims",
        confidenceScore: 0,
      };
    }

    const triagePayload = payload as { claimId?: string; severity?: string; damageType?: string; region?: string };
    
    const { content, tokenUsage } = await this.callLLM(
      CLAIMS_TRIAGE_PROMPT,
      `Triage claim for: ${JSON.stringify(triagePayload)}\n\nUser context: ${context.userQuery}`
    );

    const actionsExecuted: string[] = [];

    await actionHandler.logEvent(this.config.id, {
      eventType: "analysis",
      category: "triage",
      title: `Claims Triage: ${triagePayload.region || "Region"}`,
      description: `Triaged claim for ${triagePayload.region || "default region"}. ${triagePayload.claimId ? `Claim ID: ${triagePayload.claimId}` : ""}`,
      severity: "info",
      metadata: { payload: triagePayload, userQuery: context.userQuery }
    });
    actionsExecuted.push("logged_event");

    const severity = triagePayload.severity || "medium";
    if (severity === "high" || severity === "critical") {
      await actionHandler.createAlert(this.config.id, {
        alertType: "warning",
        title: `Claim Alert: ${triagePayload.region || "Region"}`,
        message: `${severity.toUpperCase()} severity claim detected. Immediate review recommended. ${content.substring(0, 200)}...`,
        severity: severity === "critical" ? "critical" : "high",
        relatedAssetType: "claim",
        relatedAssetId: triagePayload.claimId || "default",
        metadata: { claimId: triagePayload.claimId, damageType: triagePayload.damageType }
      });
      actionsExecuted.push("created_alert");

      await actionHandler.sendNotification(this.config.id, {
        notificationType: "in_app",
        recipient: "claims-operations",
        subject: `Claim Alert: ${severity.toUpperCase()} severity`,
        message: `Claims triage indicates ${severity} severity claim in ${triagePayload.region || "region"}. Review recommended actions.`,
        priority: severity === "critical" ? "urgent" : "high"
      });
      actionsExecuted.push("sent_notification");
    }

    if (context.userQuery.toLowerCase().includes("inspect") || 
        context.userQuery.toLowerCase().includes("review") ||
        severity === "critical") {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() + 2);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 8);

      await actionHandler.scheduleMaintenance(this.config.id, {
        title: `Priority Claim Inspection: ${triagePayload.region || "Region"}`,
        description: `Priority inspection for ${severity} severity claim`,
        assetId: triagePayload.claimId || "claim-default",
        assetType: "claim",
        assetName: triagePayload.claimId || "Default Claim",
        maintenanceType: "preventive",
        priority: severity === "critical" ? "urgent" : "high",
        scheduledStart: startDate,
        scheduledEnd: endDate,
        notes: `Triggered by claims triage. Severity: ${severity}`
      });
      actionsExecuted.push("scheduled_maintenance");
    }

    return {
      success: true,
      action,
      data: {
        analysis: content,
        region: triagePayload.region || "default",
        timestamp: new Date().toISOString(),
        actionsExecuted,
      },
      confidenceScore: 0.85,
      tokenUsage,
    };
  }
}

export const stormResilienceAgent = new StormResilienceAgent();
