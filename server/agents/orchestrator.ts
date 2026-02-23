import { supervisorAgent } from "./supervisor-agent";
import { stormResilienceAgent } from "./specialized/storm-agent";
import { loadForecastAgent } from "./specialized/load-forecast-agent";
import { gridTopologyAgent } from "./specialized/grid-topology-agent";
import { capacityCheckAgent } from "./specialized/capacity-agent";
import { db } from "../db";
import { agentMetrics } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { AgentContext, AgentResult, TrustLevel, AgentType } from "./types";
import { averecionClient } from "./averecion-client";

// Agent definitions for registration
const AGENT_DEFINITIONS = [
  {
    agentId: "supervisor",
    agentType: "supervisor",
    name: "Supervisor Agent",
    description: "Routes queries to specialized agents based on intent analysis",
    capabilities: ["query_routing", "intent_classification", "agent_coordination"],
    trustLevel: "guided",
  },
  {
    agentId: "claims-triage-agent",
    agentType: "claims_triage",
    name: "Claims Triage Agent",
    description: "Classifies claim severity, assesses damage, scores priority",
    capabilities: ["claim_classification", "severity_assessment", "priority_scoring"],
    trustLevel: "guided",
  },
  {
    agentId: "backlog-analysis-agent",
    agentType: "backlog_analysis",
    name: "Backlog Analysis Agent",
    description: "Analyzes backlog metrics, queue throughput, bottlenecks",
    capabilities: ["queue_analysis", "throughput_forecasting", "bottleneck_detection"],
    trustLevel: "guided",
  },
  {
    agentId: "adjuster-management-agent",
    agentType: "adjuster_management",
    name: "Adjuster Management Agent",
    description: "Optimizes adjuster assignments and workload balancing",
    capabilities: ["workload_balancing", "specialty_matching", "assignment_optimization"],
    trustLevel: "guided",
  },
  {
    agentId: "storm-assessment-agent",
    agentType: "storm_assessment",
    name: "Storm Assessment Agent",
    description: "Analyzes storm impacts, estimates losses, clusters claims",
    capabilities: ["storm_analysis", "loss_estimation", "claims_clustering"],
    trustLevel: "supervised",
  },
];

class AgentOrchestrator {
  async processQuery(userQuery: string, conversationHistory: Array<{ role: string; content: string }> = []): Promise<AgentResult> {
    const correlationId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      const routingDecision = await supervisorAgent.routeQuery(userQuery);
      
      console.log(`[Orchestrator] Query routed to ${routingDecision.targetAgent} with action ${routingDecision.action}`);

      const targetAgent = this.getAgent(routingDecision.targetAgent);

      if (!targetAgent) {
        const context = await this.buildContext("supervisor-main", "supervisor", userQuery, conversationHistory);
        return supervisorAgent.execute(context, "query_response", { query: userQuery });
      }

      const context = await this.buildContext(
        targetAgent.id,
        routingDecision.targetAgent,
        userQuery,
        conversationHistory
      );

      const result = await targetAgent.agent.execute(
        context,
        routingDecision.action,
        routingDecision.context
      );

      return {
        ...result,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error("[Orchestrator] Error processing query:", error);
      return {
        success: false,
        action: "query_response",
        error: error instanceof Error ? error.message : "Unknown error",
        confidenceScore: 0,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  private getAgent(agentType: AgentType): { id: string; agent: any } | null {
    switch (agentType) {
      case "claims_triage":
        return { id: "claims-triage-agent", agent: stormResilienceAgent };
      case "backlog_analysis":
        return { id: "backlog-analysis-agent", agent: loadForecastAgent };
      case "adjuster_management":
        return { id: "adjuster-management-agent", agent: gridTopologyAgent };
      case "storm_assessment":
        return { id: "storm-assessment-agent", agent: capacityCheckAgent };
      case "supervisor":
        return { id: "supervisor-main", agent: supervisorAgent };
      default:
        return null;
    }
  }

  private async buildContext(
    agentId: string,
    agentType: AgentType,
    userQuery: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<AgentContext> {
    const [metrics] = await db
      .select()
      .from(agentMetrics)
      .where(eq(agentMetrics.agentId, agentId));

    const trustLevel: TrustLevel = (metrics?.trustLevel as TrustLevel) || "supervised";
    const trustScore = metrics?.trustScore || 0;

    return {
      agentId,
      agentType,
      trustLevel,
      trustScore,
      conversationHistory,
      userQuery,
    };
  }

  async getAgentStatus(): Promise<Array<{
    agentId: string;
    type: string;
    trustLevel: string;
    trustScore: number;
    totalDecisions: number;
    successRate: number;
  }>> {
    const metrics = await db.select().from(agentMetrics);

    return metrics.map((m) => ({
      agentId: m.agentId,
      type: m.agentType,
      trustLevel: m.trustLevel,
      trustScore: m.trustScore,
      totalDecisions: m.totalDecisions,
      successRate: m.totalDecisions > 0
        ? (m.successfulDecisions / m.totalDecisions) * 100
        : 0,
    }));
  }

  async registerWithAverecion(retryOnFailure = true): Promise<{
    orchestrator: { success: boolean; orchestratorId?: string; error?: string };
    agents: { registered: number; failed: number; results: Array<{ agentId: string; success: boolean; error?: string }> };
  }> {
    console.log("[Orchestrator] Registering orchestrator with Averecion...");
    const orchestratorResult = await averecionClient.registerOrchestrator();
    
    averecionClient.startOrchestratorHeartbeat();

    console.log("[Orchestrator] Registering all agents with Averecion...");
    const agentResults: Array<{ agentId: string; success: boolean; error?: string }> = [];
    let registered = 0;
    let failed = 0;

    for (const agent of AGENT_DEFINITIONS) {
      const result = await averecionClient.registerAgent(agent);
      
      if (result.success) {
        registered++;
        averecionClient.startAgentHeartbeat(agent.agentId, result.agentId);
      } else {
        failed++;
      }

      agentResults.push({
        agentId: agent.agentId,
        success: result.success,
        error: result.error,
      });
    }

    console.log(`[Orchestrator] Registration complete: ${registered} agents registered, ${failed} failed`);

    if (failed > 0 && registered === 0 && retryOnFailure) {
      const retryDelayMs = 30000;
      console.log(`[Orchestrator] All registrations failed - retrying in ${retryDelayMs / 1000}s...`);
      setTimeout(() => {
        this.registerWithAverecion(false);
      }, retryDelayMs);
    }
    
    return {
      orchestrator: orchestratorResult,
      agents: { registered, failed, results: agentResults }
    };
  }

  async registerAllAgents(): Promise<{
    registered: number;
    failed: number;
    agents: Array<{ agentId: string; success: boolean; error?: string }>;
  }> {
    const result = await this.registerWithAverecion();
    return {
      registered: result.agents.registered,
      failed: result.agents.failed,
      agents: result.agents.results,
    };
  }

  getAgentDefinitions() {
    return AGENT_DEFINITIONS;
  }
}

export const agentOrchestrator = new AgentOrchestrator();
