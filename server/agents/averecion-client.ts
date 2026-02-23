import type { AgentContext, ActionType, GovernanceDecision } from "./types";

const AVERECION_URL = process.env.AVERECION_URL || "https://32d757aa-dd5b-4512-b098-185ac1117afd-00-426j23v5ojsk.riker.replit.dev";
const ORGANIZATION_ID = process.env.AVERECION_ORG_ID || "d28b8231-8d56-4c14-b040-720749460de7";

function getApiKey(): string | undefined {
  const key = (process.env.AVERECION_API_KEY_OVERRIDE || process.env.AVERECION_API_KEY || "").trim();
  return key || undefined;
}

interface AgentRegistration {
  agentId: string;
  agentType: string;
  name: string;
  description: string;
  capabilities: string[];
  trustLevel: string;
}

interface AverecionGovernanceResponse {
  approved: boolean;
  requiresApproval?: boolean;
  reason?: string;
  modifiedAction?: string;
  constraints?: Record<string, unknown>;
  error?: string;
}

const HEARTBEAT_INTERVAL_MS = 30000;
const AGENT_HEARTBEAT_INTERVAL_MS = 15000;
const ORCHESTRATOR_HEARTBEAT_INTERVAL_MS = 20000;

class AverecionClient {
  private instanceId: string;
  private startTime: Date;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private orchestratorHeartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeat: Date | null = null;
  private lastOrchestratorHeartbeat: Date | null = null;
  private heartbeatFailures: number = 0;
  private orchestratorId: string | null = null;
  private registeredAgents: Map<string, { 
    averecionId: string | null;
    interval: NodeJS.Timeout; 
    lastHeartbeat: Date | null 
  }> = new Map();

  constructor() {
    this.instanceId = `claimflow-${Date.now().toString(36)}`;
    this.startTime = new Date();
  }

  // Register the app orchestrator with Averecion
  async registerOrchestrator(): Promise<{
    success: boolean;
    orchestratorId?: string;
    error?: string;
  }> {
    try {
      const payload = {
        name: "ClaimFlow Orchestrator",
        type: "orchestrator",
        description: "Multi-agent insurance claims management orchestrator for storm backlog processing",
        organizationId: ORGANIZATION_ID,
        version: "1.0.0",
        capabilities: [
          "agent_routing",
          "query_classification",
          "governance_enforcement",
          "human_in_loop_coordination"
        ],
        metadata: {
          platform: "claimflow",
          instanceId: this.instanceId,
          startTime: this.startTime.toISOString(),
        }
      };

      console.log(`[Orchestrator Registration] Registering with Averecion...`);

      const response = await fetch(`${AVERECION_URL}/api/orchestrators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getApiKey() && { "X-API-Key": getApiKey()! }),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        this.orchestratorId = data.id || data.orchestratorId || this.instanceId;
        console.log(`[Orchestrator Registration] Registered with ID: ${this.orchestratorId}`);
        return { success: true, orchestratorId: this.orchestratorId ?? undefined };
      } else {
        const errorText = await response.text();
        console.log(`[Orchestrator Registration] Failed: ${response.status} - ${errorText.substring(0, 200)}`);
        // Use local ID if registration fails
        this.orchestratorId = this.instanceId;
        return { success: false, orchestratorId: this.instanceId, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      console.error("[Orchestrator Registration] Error:", error instanceof Error ? error.message : error);
      this.orchestratorId = this.instanceId;
      return { success: false, orchestratorId: this.instanceId, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }

  // Send orchestrator heartbeat to Averecion
  async sendOrchestratorHeartbeat(): Promise<{ success: boolean; latencyMs: number }> {
    const startTime = Date.now();
    const orchestratorId = this.orchestratorId || this.instanceId;

    try {
      const payload = {
        status: "active",
        timestamp: new Date().toISOString(),
        agentCount: this.registeredAgents.size,
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
        metrics: {
          activeAgents: Array.from(this.registeredAgents.keys()),
          instanceId: this.instanceId,
        }
      };

      const response = await fetch(`${AVERECION_URL}/api/orchestrators/${orchestratorId}/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getApiKey() && { "X-API-Key": getApiKey()! }),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        this.lastOrchestratorHeartbeat = new Date();
        console.log(`[Orchestrator Heartbeat] Sent successfully (${latencyMs}ms)`);
        return { success: true, latencyMs };
      } else {
        console.log(`[Orchestrator Heartbeat] Failed: ${response.status}`);
        return { success: false, latencyMs };
      }
    } catch (error) {
      console.error("[Orchestrator Heartbeat] Error:", error instanceof Error ? error.message : error);
      return { success: false, latencyMs: Date.now() - startTime };
    }
  }

  // Start orchestrator heartbeat loop
  startOrchestratorHeartbeat(): void {
    if (this.orchestratorHeartbeatInterval) {
      return;
    }

    console.log(`[Orchestrator] Starting heartbeat (every ${ORCHESTRATOR_HEARTBEAT_INTERVAL_MS / 1000}s)`);

    this.orchestratorHeartbeatInterval = setInterval(() => {
      this.sendOrchestratorHeartbeat();
    }, ORCHESTRATOR_HEARTBEAT_INTERVAL_MS);

    // Send initial heartbeat
    this.sendOrchestratorHeartbeat();
  }

  // Stop orchestrator heartbeat
  stopOrchestratorHeartbeat(): void {
    if (this.orchestratorHeartbeatInterval) {
      clearInterval(this.orchestratorHeartbeatInterval);
      this.orchestratorHeartbeatInterval = null;
    }
  }

  // Get orchestrator status
  getOrchestratorStatus(): {
    orchestratorId: string | null;
    instanceId: string;
    isHeartbeatRunning: boolean;
    lastHeartbeat: string | null;
    uptime: number;
  } {
    return {
      orchestratorId: this.orchestratorId,
      instanceId: this.instanceId,
      isHeartbeatRunning: this.orchestratorHeartbeatInterval !== null,
      lastHeartbeat: this.lastOrchestratorHeartbeat?.toISOString() ?? null,
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
    };
  }

  // Register an agent with Averecion using official SDK pattern
  async registerAgent(registration: AgentRegistration): Promise<{
    success: boolean;
    agentId?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${AVERECION_URL}/api/agents/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(getApiKey() && { "X-API-Key": getApiKey()! }),
        },
        body: JSON.stringify({
          name: registration.name,
          description: registration.description,
          endpoint: `https://${process.env.REPL_SLUG || "claimflow"}.${process.env.REPL_OWNER || "replit"}.repl.co/api/agent/${registration.agentId}`,
          capabilities: registration.capabilities,
          organizationId: ORGANIZATION_ID,
          discoverySource: "sdk",
          localAgentId: registration.agentId,
          metadata: {
            agentType: registration.agentType,
            trustLevel: registration.trustLevel,
            instanceId: this.instanceId,
            localAgentId: registration.agentId,
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        // Extract the unique agent ID from Averecion's response
        // Try multiple fields that might contain the agent ID
        const averecionId = data.agentId || data.agent?.id || data.id || null;
        
        if (averecionId) {
          console.log(`Agent ${registration.name} registered with Averecion ID: ${averecionId}`);
        } else {
          console.log(`Agent ${registration.name} registered (no Averecion ID returned, using local ID)`);
          console.log(`  Response data:`, JSON.stringify(data));
        }
        
        return { success: true, agentId: averecionId || registration.agentId };
      } else {
        const errorText = await response.text();
        const error = `Registration failed: ${response.status} - ${errorText}`;
        console.error(`Agent ${registration.name} registration failed:`, error);
        return { success: false, error };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`Agent ${registration.name} registration error:`, errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  // Send heartbeat using official SDK pattern
  async sendAgentHeartbeat(localAgentId: string): Promise<{
    status: string;
    agentId: string;
    averecionId: string;
    success: boolean;
    error?: string;
  }> {
    const agentData = this.registeredAgents.get(localAgentId);
    const averecionId = agentData?.averecionId || localAgentId;

    try {
      const response = await fetch(`${AVERECION_URL}/api/agents/${averecionId}/heartbeat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(getApiKey() && { "X-API-Key": getApiKey()! }),
        },
        body: JSON.stringify({
          status: "active",
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        if (agentData) {
          agentData.lastHeartbeat = new Date();
        }
        return { status: "active", agentId: localAgentId, averecionId, success: true };
      } else {
        const errorText = await response.text();
        return { status: "error", agentId: localAgentId, averecionId, success: false, error: `HTTP ${response.status}: ${errorText}` };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return { status: "error", agentId: localAgentId, averecionId, success: false, error: errorMsg };
    }
  }

  // Start heartbeat loop for an agent
  startAgentHeartbeat(agentId: string, averecionId?: string): void {
    if (this.registeredAgents.has(agentId)) {
      return;
    }

    const interval = setInterval(async () => {
      const result = await this.sendAgentHeartbeat(agentId);
      if (!result.success) {
        console.error(`Heartbeat failed for ${agentId}:`, result.error);
      }
    }, AGENT_HEARTBEAT_INTERVAL_MS);

    this.registeredAgents.set(agentId, { 
      averecionId: averecionId || null,
      interval, 
      lastHeartbeat: null 
    });
    
    console.log(`Starting heartbeat for agent ${agentId} (every ${AGENT_HEARTBEAT_INTERVAL_MS / 1000}s)`);
    this.sendAgentHeartbeat(agentId);
  }

  // Stop agent heartbeat
  stopAgentHeartbeat(agentId: string): void {
    const data = this.registeredAgents.get(agentId);
    if (data) {
      clearInterval(data.interval);
      this.registeredAgents.delete(agentId);
    }
  }

  // Get status of all registered agents
  getAgentHeartbeatStatus(): Array<{
    agentId: string;
    averecionId: string | null;
    lastHeartbeat: string | null;
    isActive: boolean;
  }> {
    const result: Array<{ agentId: string; averecionId: string | null; lastHeartbeat: string | null; isActive: boolean }> = [];
    this.registeredAgents.forEach((data, agentId) => {
      result.push({
        agentId,
        averecionId: data.averecionId,
        lastHeartbeat: data.lastHeartbeat?.toISOString() ?? null,
        isActive: true,
      });
    });
    return result;
  }

  // Check governance before action using official SDK pattern
  async checkAction(
    context: AgentContext,
    action: ActionType,
    payload: unknown
  ): Promise<GovernanceDecision> {
    const agentData = this.registeredAgents.get(context.agentId);
    const averecionId = agentData?.averecionId || context.agentId;

    const requestBody = {
      agentId: averecionId,
      action: action,
      context: payload,
    };
    
    console.log(`[Governance Check] Sending to ${AVERECION_URL}/api/governance/check:`, JSON.stringify(requestBody));

    try {
      const response = await fetch(`${AVERECION_URL}/api/governance/check`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(getApiKey() && { "X-API-Key": getApiKey()! }),
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        // Averecion returns: { status: "approved"|"requires_approval"|"denied", reason, alignmentScore }
        const status = data.status || "";
        const isApproved = status === "approved";
        const requiresApproval = status === "requires_approval";
        
        console.log(`[Governance] Agent ${context.agentId} action ${action}: ${status} (score: ${data.alignmentScore ?? "N/A"})`);
        
        return {
          approved: isApproved,
          requiresHumanReview: requiresApproval,
          reason: data.reason,
          modifiedAction: data.modifiedAction as ActionType | undefined,
          constraints: data.constraints,
          alignmentScore: data.alignmentScore,
        };
      } else {
        const errorText = await response.text();
        console.log(`Governance check returned ${response.status}: ${errorText}, using local rules`);
        const localDecision = this.localGovernance(context, action);
        this.queueLocalDecision(context, action, payload, localDecision);
        return localDecision;
      }
    } catch (error) {
      console.log(`Governance check failed, using local rules:`, error instanceof Error ? error.message : error);
      const localDecision = this.localGovernance(context, action);
      this.queueLocalDecision(context, action, payload, localDecision);
      return localDecision;
    }
  }

  private async queueLocalDecision(
    context: AgentContext,
    action: ActionType,
    payload: unknown,
    decision: GovernanceDecision
  ): Promise<void> {
    try {
      const { syncService } = await import("./sync-service");
      await syncService.queueForSync({
        correlationId: crypto.randomUUID(),
        agentId: context.agentId,
        action: action,
        payload: JSON.stringify({ context: context, payload }),
        decision: decision.approved ? "approved_locally" : "requires_review",
        success: decision.approved,
      });
    } catch (error) {
      console.error("[Governance] Failed to queue local decision for sync:", error);
    }
  }

  // Report outcome after action completes using official SDK pattern
  async reportOutcome(
    agentId: string,
    action: ActionType,
    success: boolean,
    alignmentScore: number = 1.0
  ): Promise<void> {
    const agentData = this.registeredAgents.get(agentId);
    const averecionId = agentData?.averecionId || agentId;

    const requestBody = {
      agentId: averecionId,
      action: action,
      outcome: success ? "success" : "failure",
      alignmentScore: alignmentScore,
    };
    
    console.log(`[Governance Outcome] Sending to ${AVERECION_URL}/api/governance/outcome:`, JSON.stringify(requestBody));

    try {
      const response = await fetch(`${AVERECION_URL}/api/governance/outcome`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(getApiKey() && { "X-API-Key": getApiKey()! }),
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        console.log(`[Governance Outcome] Success for ${agentId}/${action}`);
      } else {
        console.log(`[Governance Outcome] Failed: ${response.status} ${await response.text()}`);
      }
    } catch (error) {
      console.error("[Governance Outcome] Error:", error instanceof Error ? error.message : error);
    }
  }

  // Report decision telemetry for Decision Inspector
  async reportDecision(
    agentId: string,
    action: ActionType,
    context: Record<string, unknown>,
    rationale: string,
    options?: {
      confidence?: number;
      riskLevel?: "low" | "medium" | "high" | "critical";
    }
  ): Promise<void> {
    const agentData = this.registeredAgents.get(agentId);
    const averecionId = agentData?.averecionId || agentId;

    const payload = {
      agentId: averecionId,
      action: action,
      rationale: rationale,
      confidence: options?.confidence ?? 0.8,
      riskLevel: options?.riskLevel ?? "low",
      context: context,
    };

    console.log(`[Telemetry Decision] Sending to ${AVERECION_URL}/api/telemetry/decision:`, JSON.stringify(payload));

    try {
      const response = await fetch(`${AVERECION_URL}/api/telemetry/decision`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(getApiKey() && { "X-API-Key": getApiKey()! }),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          console.log(`[Telemetry] Decision reported for ${agentId}: ${action}`);
        } else {
          console.log(`[Telemetry] Decision endpoint returned non-JSON response`);
        }
      } else if (response.status === 404) {
        console.log(`[Telemetry] Decision endpoint not found (404)`);
      } else {
        console.log(`[Telemetry] Decision report returned ${response.status}`);
      }
    } catch (error) {
      console.error("[Telemetry] Decision report failed:", error instanceof Error ? error.message : error);
    }
  }

  // High-risk actions that require options generation
  private readonly HIGH_RISK_ACTIONS = [
    "schedule_grid_downtime",
    "emergency_load_shed",
    "disconnect_service",
    "approve_large_expenditure",
    "modify_rate_structure",
    "assess_storm",
    "manage_adjusters",
  ];

  // Check if action requires options
  isHighRiskAction(action: string): boolean {
    return this.HIGH_RISK_ACTIONS.includes(action);
  }

  // Request action options for high-risk actions
  async requestActionOptions(
    agentId: string,
    action: string,
    context: {
      goal: string;
      context: string;
      riskLevel: "low" | "medium" | "high" | "critical";
      isIrreversible?: boolean;
      affectedEntities?: number;
    }
  ): Promise<{
    success: boolean;
    optionsId?: string;
    options?: Array<{
      id: string;
      action: string;
      description: string;
      riskLevel: string;
      estimatedImpact: string;
      recommended: boolean;
    }>;
    error?: string;
  }> {
    const agentData = this.registeredAgents.get(agentId);
    const averecionId = agentData?.averecionId || agentId;

    try {
      const response = await fetch(`${AVERECION_URL}/api/options/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getApiKey() && { "X-API-Key": getApiKey()! }),
        },
        body: JSON.stringify({
          agentId: averecionId,
          action: action,
          goal: context.goal,
          context: context.context,
          riskLevel: context.riskLevel,
          isIrreversible: context.isIrreversible ?? false,
          affectedEntities: context.affectedEntities,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Options] Generated ${data.options?.length || 0} options for ${action}`);
        return {
          success: true,
          optionsId: data.optionsId || data.id,
          options: data.options || [],
        };
      } else {
        const errorText = await response.text();
        console.log(`[Options] Generate failed: ${response.status}`);
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[Options] Request failed:", errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  // Select an option (agent auto-selection)
  async selectOption(
    agentId: string,
    optionsId: string,
    selectedOptionId: string,
    rationale: string
  ): Promise<{
    success: boolean;
    approved?: boolean;
    error?: string;
  }> {
    const agentData = this.registeredAgents.get(agentId);
    const averecionId = agentData?.averecionId || agentId;

    try {
      const response = await fetch(`${AVERECION_URL}/api/options/${optionsId}/select`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getApiKey() && { "X-API-Key": getApiKey()! }),
        },
        body: JSON.stringify({
          agentId: averecionId,
          selectedOptionId: selectedOptionId,
          rationale: rationale,
          selectionType: "agent",
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Options] Selected option ${selectedOptionId} for ${optionsId}`);
        return { success: true, approved: data.approved };
      } else {
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[Options] Selection failed:", errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  // Wait for human to select option in dashboard
  async waitForOptionSelection(
    optionsId: string,
    timeoutMs: number = 300000 // 5 minutes default
  ): Promise<{
    success: boolean;
    selectedOptionId?: string;
    selectedBy?: string;
    timedOut?: boolean;
    error?: string;
  }> {
    const pollInterval = 5000; // 5 seconds
    const maxAttempts = Math.ceil(timeoutMs / pollInterval);
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${AVERECION_URL}/api/options/${optionsId}/status`, {
          method: "GET",
          headers: {
            ...(getApiKey() && { "X-API-Key": getApiKey()! }),
          },
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === "selected") {
            console.log(`[Options] Human selected option ${data.selectedOptionId}`);
            return {
              success: true,
              selectedOptionId: data.selectedOptionId,
              selectedBy: data.selectedBy,
            };
          } else if (data.status === "expired" || data.status === "cancelled") {
            return { success: false, error: `Options ${data.status}` };
          }
          // Still pending, continue polling
        }
      } catch (error) {
        // Ignore polling errors, continue trying
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      attempts++;
    }

    console.log(`[Options] Timeout waiting for selection on ${optionsId}`);
    return { success: false, timedOut: true };
  }

  // Local governance rules when Averecion is unavailable
  private localGovernance(
    context: AgentContext,
    action: ActionType
  ): GovernanceDecision {
    const highRiskActions: ActionType[] = ["assess_storm", "manage_adjusters"];
    const mediumRiskActions: ActionType[] = ["analyze_backlog", "triage_claim"];

    switch (context.trustLevel) {
      case "supervised":
        if (action === "query_response") {
          return { approved: true, requiresHumanReview: false };
        }
        return {
          approved: false,
          requiresHumanReview: true,
          reason: "Supervised agents require approval for this action",
        };

      case "guided":
        if (highRiskActions.includes(action)) {
          return {
            approved: false,
            requiresHumanReview: true,
            reason: "High-risk action requires approval",
          };
        }
        return { approved: true, requiresHumanReview: false };

      case "semi_autonomous":
        if (highRiskActions.includes(action)) {
          return {
            approved: true,
            requiresHumanReview: true,
            reason: "High-risk action approved but flagged for review",
          };
        }
        return { approved: true, requiresHumanReview: false };

      default:
        return {
          approved: false,
          requiresHumanReview: true,
          reason: "Unknown trust level",
        };
    }
  }

  // Check if Averecion is connected
  async checkConnection(): Promise<{
    connected: boolean;
    configured: boolean;
    latencyMs?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${AVERECION_URL}/api/health`, {
        method: "GET",
        headers: {
          ...(getApiKey() && { "X-API-Key": getApiKey()! }),
        },
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        return {
          connected: true,
          configured: true,
          latencyMs,
        };
      } else {
        return {
          connected: false,
          configured: true,
          latencyMs,
          error: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        connected: false,
        configured: true,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Fetch agent trust levels and autonomy status from Averecion
  async getAgentAutonomy(): Promise<{
    success: boolean;
    agents: Array<{
      agentId: string;
      averecionId: string;
      name: string;
      trustLevel: string;
      trustScore: number;
      totalDecisions: number;
      successfulDecisions: number;
      successRate: number;
      promotionEligible: boolean;
      nextLevel: string | null;
      progress: Record<string, { current: number; required: number; met: boolean }>;
    }>;
    error?: string;
  }> {
    try {
      // Get all registered agent IDs
      const agentIds = Array.from(this.registeredAgents.keys());
      const agents: Array<{
        agentId: string;
        averecionId: string;
        name: string;
        trustLevel: string;
        trustScore: number;
        totalDecisions: number;
        successfulDecisions: number;
        successRate: number;
        promotionEligible: boolean;
        nextLevel: string | null;
        progress: Record<string, { current: number; required: number; met: boolean }>;
      }> = [];

      for (const localAgentId of agentIds) {
        const agentData = this.registeredAgents.get(localAgentId);
        const averecionId = agentData?.averecionId;

        if (!averecionId) continue;

        try {
          const response = await fetch(`${AVERECION_URL}/api/agents/${averecionId}/status`, {
            method: "GET",
            headers: {
              ...(getApiKey() && { "X-API-Key": getApiKey()! }),
            },
            signal: AbortSignal.timeout(5000),
          });

          if (response.ok) {
            const data = await response.json();
            
            // Extract trust and autonomy data from Averecion response
            const trustLevel = data.trustLevel || data.metadata?.trustLevel || "supervised";
            const trustScore = data.trustScore ?? data.alignmentScore ?? 0.5;
            const totalDecisions = data.totalDecisions ?? data.decisionCount ?? 0;
            const successfulDecisions = data.successfulDecisions ?? Math.round(totalDecisions * (data.successRate ?? 1));
            const successRate = totalDecisions > 0 ? (successfulDecisions / totalDecisions) * 100 : 100;
            
            // Calculate promotion eligibility based on Averecion data
            const promotionCriteria: Record<string, { minDecisions: number; minSuccessRate: number; minTrustScore: number }> = {
              supervised: { minDecisions: 50, minSuccessRate: 0.85, minTrustScore: 0.7 },
              guided: { minDecisions: 200, minSuccessRate: 0.92, minTrustScore: 0.9 },
            };

            const criteria = promotionCriteria[trustLevel];
            const nextLevel = trustLevel === "supervised" ? "guided" : trustLevel === "guided" ? "semi_autonomous" : null;
            
            let promotionEligible = false;
            const progress: Record<string, { current: number; required: number; met: boolean }> = {};
            
            if (criteria && nextLevel) {
              progress.decisions = { current: totalDecisions, required: criteria.minDecisions, met: totalDecisions >= criteria.minDecisions };
              progress.successRate = { current: successRate / 100, required: criteria.minSuccessRate, met: (successRate / 100) >= criteria.minSuccessRate };
              progress.trustScore = { current: trustScore, required: criteria.minTrustScore, met: trustScore >= criteria.minTrustScore };
              
              promotionEligible = progress.decisions.met && progress.successRate.met && progress.trustScore.met;
            }

            agents.push({
              agentId: localAgentId,
              averecionId,
              name: data.name || localAgentId,
              trustLevel,
              trustScore,
              totalDecisions,
              successfulDecisions,
              successRate,
              promotionEligible,
              nextLevel,
              progress,
            });
          }
        } catch (agentError) {
          // If individual agent fetch fails, continue with others
          console.error(`Failed to fetch autonomy for agent ${localAgentId}:`, agentError);
        }
      }

      return { success: true, agents };
    } catch (error) {
      return {
        success: false,
        agents: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // System heartbeat
  async sendHeartbeat(): Promise<{ success: boolean; latencyMs: number }> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${AVERECION_URL}/api/health`, {
        method: "GET",
        headers: {
          ...(getApiKey() && { "X-API-Key": getApiKey()! }),
        },
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Date.now() - startTime;
      const success = response.ok;

      if (success) {
        this.lastHeartbeat = new Date();
        this.heartbeatFailures = 0;
        console.log(`Heartbeat sent successfully (${latencyMs}ms)`);
      } else {
        this.heartbeatFailures++;
      }

      return { success, latencyMs };
    } catch (error) {
      this.heartbeatFailures++;
      return { success: false, latencyMs: Date.now() - startTime };
    }
  }

  startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return;
    }

    console.log(`Starting Averecion heartbeat (every ${HEARTBEAT_INTERVAL_MS / 1000}s)`);

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    this.sendHeartbeat();
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getHeartbeatStatus(): {
    isRunning: boolean;
    lastHeartbeat: string | null;
    consecutiveFailures: number;
    instanceId: string;
    uptimeSeconds: number;
  } {
    return {
      isRunning: this.heartbeatInterval !== null,
      lastHeartbeat: this.lastHeartbeat?.toISOString() ?? null,
      consecutiveFailures: this.heartbeatFailures,
      instanceId: this.instanceId,
      uptimeSeconds: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
    };
  }

  getInstanceId(): string {
    return this.instanceId;
  }
}

export const averecionClient = new AverecionClient();
