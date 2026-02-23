import { averecionClient } from "../server/agents/averecion-client";
import type { AgentContext } from "../server/agents/types";

const testCases = [
  {
    agentId: "supervisor",
    agentType: "supervisor" as const,
    action: "query_response" as const,
    query: "What agents are available?",
  },
  {
    agentId: "storm-agent", 
    agentType: "storm_resilience" as const,
    action: "analyze_storm_resilience" as const,
    query: "Assess hurricane risk for coastal substations",
  },
  {
    agentId: "load-forecast-agent",
    agentType: "load_forecast" as const,
    action: "generate_load_forecast" as const,
    query: "Forecast load for next quarter",
  },
  {
    agentId: "grid-topology-agent",
    agentType: "grid_topology" as const,
    action: "trace_network" as const,
    query: "Trace network from substation ATL-001",
  },
  {
    agentId: "capacity-agent",
    agentType: "capacity_check" as const,
    action: "check_capacity" as const,
    query: "Can we connect a 50 MW data center?",
  },
];

async function testGovernance() {
  console.log("=== Testing Governance Check for Each Agent ===\n");

  for (const test of testCases) {
    const context: AgentContext = {
      agentId: test.agentId,
      agentType: test.agentType,
      trustLevel: "supervised",
      trustScore: 50,
      conversationHistory: [],
      userQuery: test.query,
    };

    console.log(`[${test.agentId}] Testing action: ${test.action}`);
    console.log(`  Query: "${test.query}"`);

    try {
      const result = await averecionClient.checkAction(context, test.action, { query: test.query });
      console.log(`  Result:`);
      console.log(`    Approved: ${result.approved}`);
      console.log(`    Requires Human Review: ${result.requiresHumanReview}`);
      console.log(`    Reason: ${result.reason || "N/A"}`);
      if (result.constraints) {
        console.log(`    Constraints: ${JSON.stringify(result.constraints)}`);
      }
    } catch (error) {
      console.log(`  Error: ${error instanceof Error ? error.message : error}`);
    }
    console.log("");
  }

  console.log("=== Governance Check Complete ===");
}

testGovernance().catch(console.error);
