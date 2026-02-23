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
    agentId: "storm-agent",
    agentType: "storm_resilience",
    name: "Storm Resilience Agent",
    description: "Analyzes weather events, outage risks, and vegetation management",
    capabilities: ["storm_assessment", "outage_prediction", "vegetation_risk"],
    trustLevel: "guided",
  },
  {
    agentId: "load-forecast-agent",
    agentType: "load_forecast",
    name: "Load Forecast Agent",
    description: "Generates demand projections and growth analysis",
    capabilities: ["load_forecasting", "demand_projection", "growth_analysis"],
    trustLevel: "guided",
  },
  {
    agentId: "grid-topology-agent",
    agentType: "grid_topology",
    name: "Grid Topology Agent",
    description: "Performs network tracing and connectivity analysis",
    capabilities: ["network_trace", "topology_analysis", "connectivity_check"],
    trustLevel: "guided",
  },
  {
    agentId: "capacity-agent",
    agentType: "capacity_check",
    name: "Capacity Agent",
    description: "Analyzes headroom and upgrade requirements for new connections",
    capabilities: ["capacity_analysis", "headroom_check", "upgrade_planning"],
    trustLevel: "supervised",
  },
];

class AgentOrchestrator {
  // Main entry point for processing user queries
  async processQuery(userQuery: string, conversationHistory: Array<{ role: string; content: string }> = []): Promise<AgentResult> {
    const correlationId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Step 1: Use supervisor to route the query
      const routingDecision = await supervisorAgent.routeQuery(userQuery);
      
      console.log(`[Orchestrator] Query routed to ${routingDecision.targetAgent} with action ${routingDecision.action}`);

      // Step 2: Get the appropriate agent
      const targetAgent = this.getAgent(routingDecision.targetAgent);

      if (!targetAgent) {
        // Handle with supervisor for general queries
        const context = await this.buildContext("supervisor-main", "supervisor", userQuery, conversationHistory);
        return supervisorAgent.execute(context, "query_response", { query: userQuery });
      }

      // Step 3: Build context for the target agent
      const context = await this.buildContext(
        targetAgent.id,
        routingDecision.targetAgent,
        userQuery,
        conversationHistory
      );

      // Step 4: Execute the action
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

  // Get agent by type
  private getAgent(agentType: AgentType): { id: string; agent: any } | null {
    switch (agentType) {
      case "storm_resilience":
        return { id: "storm-resilience-agent", agent: stormResilienceAgent };
      case "load_forecast":
        return { id: "load-forecast-agent", agent: loadForecastAgent };
      case "grid_topology":
        return { id: "grid-topology-agent", agent: gridTopologyAgent };
      case "capacity_check":
        return { id: "capacity-check-agent", agent: capacityCheckAgent };
      case "supervisor":
        return { id: "supervisor-main", agent: supervisorAgent };
      default:
        return null;
    }
  }

  // Build agent context with trust level from database
  private async buildContext(
    agentId: string,
    agentType: AgentType,
    userQuery: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<AgentContext> {
    // Get trust level from database
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

  // Get agent status for monitoring
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

  // Register all agents with Averecion and start their heartbeats
  async registerAllAgents(): Promise<{
    registered: number;
    failed: number;
    agents: Array<{ agentId: string; success: boolean; error?: string }>;
  }> {
    console.log("[Orchestrator] Registering all agents with Averecion...");
    
    const results: Array<{ agentId: string; success: boolean; error?: string }> = [];
    let registered = 0;
    let failed = 0;

    for (const agent of AGENT_DEFINITIONS) {
      const result = await averecionClient.registerAgent(agent);
      
      if (result.success) {
        registered++;
        // Start heartbeat for this agent with Averecion ID
        averecionClient.startAgentHeartbeat(agent.agentId, result.agentId);
      } else {
        failed++;
      }

      results.push({
        agentId: agent.agentId,
        success: result.success,
        error: result.error,
      });
    }

    console.log(`[Orchestrator] Registration complete: ${registered} registered, ${failed} failed`);
    return { registered, failed, agents: results };
  }

  // Get agent definitions
  getAgentDefinitions() {
    return AGENT_DEFINITIONS;
  }
}

export const agentOrchestrator = new AgentOrchestrator();
