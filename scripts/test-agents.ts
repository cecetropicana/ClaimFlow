import pLimit from "p-limit";

const BASE_URL = "http://localhost:5000";

interface TestCase {
  name: string;
  targetAgent: string;
  query: string;
  expectedAction: string;
  requiresApproval?: boolean;
}

const testCases: TestCase[] = [
  {
    name: "Storm Resilience - Basic Assessment",
    targetAgent: "storm",
    query: "Assess storm resilience for substations in Georgia",
    expectedAction: "storm_resilience",
    requiresApproval: true,
  },
  {
    name: "Storm Resilience - Hurricane Scenario",
    targetAgent: "storm",
    query: "What is the hurricane vulnerability for coastal substations?",
    expectedAction: "storm_resilience",
    requiresApproval: true,
  },
  {
    name: "Storm Resilience - Vegetation Risk",
    targetAgent: "storm",
    query: "Identify vegetation management priorities for transmission lines",
    expectedAction: "storm_resilience",
    requiresApproval: true,
  },
  {
    name: "Load Forecast - 10 Year Projection",
    targetAgent: "load_forecast",
    query: "Generate a 10-year load forecast for the Atlanta metro area",
    expectedAction: "forecast_load",
    requiresApproval: true,
  },
  {
    name: "Load Forecast - Peak Demand",
    targetAgent: "load_forecast",
    query: "What will peak summer demand be in 2030?",
    expectedAction: "forecast_load",
    requiresApproval: true,
  },
  {
    name: "Load Forecast - Growth Analysis",
    targetAgent: "load_forecast",
    query: "Analyze load growth trends for industrial customers",
    expectedAction: "forecast_load",
    requiresApproval: true,
  },
  {
    name: "Grid Topology - Network Trace",
    targetAgent: "grid_topology",
    query: "Trace the network downstream from substation SUB-001",
    expectedAction: "trace_network",
    requiresApproval: true,
  },
  {
    name: "Grid Topology - Upstream Trace",
    targetAgent: "grid_topology",
    query: "Show upstream connectivity to transmission source",
    expectedAction: "trace_network",
    requiresApproval: true,
  },
  {
    name: "Grid Topology - Feeder Analysis",
    targetAgent: "grid_topology",
    query: "Analyze feeder FDR-392 topology and switching points",
    expectedAction: "trace_network",
    requiresApproval: true,
  },
  {
    name: "Capacity Check - Data Center",
    targetAgent: "capacity",
    query: "Can we connect a 50 MW data center near Atlanta?",
    expectedAction: "check_capacity",
    requiresApproval: true,
  },
  {
    name: "Capacity Check - Large Industrial",
    targetAgent: "capacity",
    query: "Evaluate capacity for a new 100 MW manufacturing plant",
    expectedAction: "check_capacity",
    requiresApproval: true,
  },
  {
    name: "Capacity Check - Distribution Upgrade",
    targetAgent: "capacity",
    query: "Check if substation SUB-ATL-001 can handle 25 MW additional load",
    expectedAction: "check_capacity",
    requiresApproval: true,
  },
  {
    name: "Supervisor - General Query",
    targetAgent: "supervisor",
    query: "What types of analysis can you perform?",
    expectedAction: "query_response",
    requiresApproval: false,
  },
  {
    name: "Supervisor - Help Request",
    targetAgent: "supervisor",
    query: "Help me understand grid planning options",
    expectedAction: "query_response",
    requiresApproval: false,
  },
];

interface TestResult {
  testCase: TestCase;
  success: boolean;
  governanceBlocked: boolean;
  responseTime: number;
  response?: any;
  error?: string;
}

async function runTest(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${BASE_URL}/api/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: testCase.query }),
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();

    const governanceBlocked =
      data.success === false &&
      (data.content?.includes("require approval") ||
        data.content?.includes("requires approval") ||
        data.content?.includes("Supervised") ||
        data.content?.includes("human approval"));

    return {
      testCase,
      success: response.ok && (data.success !== false || governanceBlocked),
      governanceBlocked,
      responseTime,
      response: data,
    };
  } catch (error) {
    return {
      testCase,
      success: false,
      governanceBlocked: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function runAllTests(concurrency: number = 1): Promise<void> {
  console.log("=".repeat(60));
  console.log("AGENT TEST SUITE");
  console.log("=".repeat(60));
  console.log(`Running ${testCases.length} tests with concurrency: ${concurrency}\n`);

  const limit = pLimit(concurrency);
  const startTime = Date.now();

  const results = await Promise.all(
    testCases.map((tc) => limit(() => runTest(tc)))
  );

  const totalTime = Date.now() - startTime;

  console.log("\n" + "=".repeat(60));
  console.log("RESULTS");
  console.log("=".repeat(60));

  const byAgent: Record<string, TestResult[]> = {};

  for (const result of results) {
    const agent = result.testCase.targetAgent;
    if (!byAgent[agent]) byAgent[agent] = [];
    byAgent[agent].push(result);
  }

  for (const [agent, agentResults] of Object.entries(byAgent)) {
    console.log(`\n[${agent.toUpperCase()}]`);
    for (const result of agentResults) {
      let status: string;
      let icon: string;
      
      if (result.governanceBlocked && result.testCase.requiresApproval) {
        status = "GOVERNANCE_OK";
        icon = "~";
      } else if (result.success) {
        status = "PASS";
        icon = "✓";
      } else {
        status = "FAIL";
        icon = "✗";
      }
      
      console.log(`  ${icon} ${result.testCase.name} (${result.responseTime}ms) - ${status}`);
      if (!result.success && !result.governanceBlocked && result.error) {
        console.log(`    Error: ${result.error}`);
      }
    }
  }

  const passed = results.filter((r) => r.success && !r.governanceBlocked).length;
  const governanceBlocked = results.filter((r) => r.governanceBlocked).length;
  const failed = results.filter((r) => !r.success && !r.governanceBlocked).length;
  const avgResponseTime = Math.round(
    results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
  );

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Governance Blocked (Expected): ${governanceBlocked}`);
  console.log(`Failed: ${failed}`);
  console.log(`Effective Success Rate: ${(((passed + governanceBlocked) / results.length) * 100).toFixed(1)}%`);
  console.log(`Avg Response Time: ${avgResponseTime}ms`);
  console.log(`Total Time: ${totalTime}ms`);
  
  console.log("\n" + "=".repeat(60));
  console.log("GOVERNANCE NOTES");
  console.log("=".repeat(60));
  console.log("Supervised agents require human approval for specialized actions.");
  console.log("To test full agent capabilities, promote agents to 'guided' or 'semi_autonomous'.");
  console.log("Use the Agent Status page to view trust progression metrics.");
}

async function runStressTest(
  queriesPerSecond: number,
  durationSeconds: number
): Promise<void> {
  console.log("=".repeat(60));
  console.log("STRESS TEST");
  console.log("=".repeat(60));
  console.log(`Rate: ${queriesPerSecond} queries/second`);
  console.log(`Duration: ${durationSeconds} seconds`);
  console.log(`Total Queries: ${queriesPerSecond * durationSeconds}\n`);

  const results: TestResult[] = [];
  const startTime = Date.now();
  const endTime = startTime + durationSeconds * 1000;
  const interval = 1000 / queriesPerSecond;

  let queryIndex = 0;

  while (Date.now() < endTime) {
    const testCase = testCases[queryIndex % testCases.length];
    const result = await runTest(testCase);
    results.push(result);

    const status = result.success ? (result.governanceBlocked ? "GOV" : "OK") : "FAIL";
    process.stdout.write(
      `\r[${results.length}] ${testCase.targetAgent}: ${status} (${result.responseTime}ms)   `
    );

    queryIndex++;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  console.log("\n\n" + "=".repeat(60));
  console.log("STRESS TEST RESULTS");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.success).length;
  const governanceBlocked = results.filter((r) => r.governanceBlocked).length;
  const avgTime = Math.round(
    results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
  );
  const maxTime = Math.max(...results.map((r) => r.responseTime));
  const minTime = Math.min(...results.map((r) => r.responseTime));

  console.log(`Queries Executed: ${results.length}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log(`Governance Blocked: ${governanceBlocked}`);
  console.log(`Avg Response Time: ${avgTime}ms`);
  console.log(`Min Response Time: ${minTime}ms`);
  console.log(`Max Response Time: ${maxTime}ms`);
}

async function checkAgentStatus(): Promise<void> {
  console.log("=".repeat(60));
  console.log("AGENT STATUS CHECK");
  console.log("=".repeat(60));

  try {
    const [statusRes, heartbeatRes, approvalsRes, autonomyRes] = await Promise.all([
      fetch(`${BASE_URL}/api/agent/connection-status`),
      fetch(`${BASE_URL}/api/agent/heartbeat-status`),
      fetch(`${BASE_URL}/api/agent/approvals`),
      fetch(`${BASE_URL}/api/agent/autonomy`),
    ]);

    const status = await statusRes.json();
    const heartbeat = await heartbeatRes.json();
    const approvals = await approvalsRes.json();
    const autonomy = await autonomyRes.json();

    console.log("\n[Governance Connection]");
    console.log(`  Connected: ${status.governance?.connected ? "Yes" : "No"}`);
    console.log(`  Latency: ${status.governance?.latencyMs}ms`);

    console.log("\n[System Heartbeat]");
    console.log(`  Running: ${heartbeat.system?.isRunning ? "Yes" : "No"}`);
    console.log(`  Uptime: ${heartbeat.system?.uptimeSeconds}s`);
    console.log(`  Last Heartbeat: ${heartbeat.system?.lastHeartbeat || "Never"}`);

    console.log("\n[Agent Heartbeats]");
    for (const agent of heartbeat.agents || []) {
      console.log(`  ${agent.agentId}: ${agent.isActive ? "Active" : "Inactive"}`);
    }

    console.log("\n[Pending Approvals]");
    console.log(`  Count: ${approvals.approvals?.length || 0}`);

    console.log("\n[Agent Metrics]");
    for (const agent of status.agents || []) {
      console.log(`  ${agent.id}:`);
      console.log(`    Trust Level: ${agent.trustLevel}`);
      console.log(`    Trust Score: ${agent.trustScore}`);
      console.log(`    Decisions: ${agent.totalDecisions}`);
      console.log(`    Success Rate: ${agent.successRate}%`);
    }

    console.log("\n[Autonomy Progression]");
    for (const agent of autonomy.autonomy || []) {
      console.log(`  ${agent.agentId}:`);
      console.log(`    Current: ${agent.currentLevel} -> Next: ${agent.nextLevel}`);
      console.log(`    Eligible: ${agent.promotionEligible ? "Yes" : "No"}`);
      if (agent.progress) {
        console.log(`    Progress:`);
        console.log(`      Decisions: ${agent.progress.decisions?.current}/${agent.progress.decisions?.required}`);
        console.log(`      Success Rate: ${agent.progress.successRate?.current}%/${agent.progress.successRate?.required}%`);
        console.log(`      Trust Score: ${agent.progress.trustScore?.current}/${agent.progress.trustScore?.required}`);
      }
    }
  } catch (error) {
    console.error("Failed to fetch status:", error);
  }
}

async function runSingleAgent(agentType: string): Promise<void> {
  const agentTests = testCases.filter((tc) => tc.targetAgent === agentType);
  
  if (agentTests.length === 0) {
    console.log(`No tests found for agent type: ${agentType}`);
    console.log(`Available agents: storm, load_forecast, grid_topology, capacity, supervisor`);
    return;
  }
  
  console.log("=".repeat(60));
  console.log(`TESTING: ${agentType.toUpperCase()}`);
  console.log("=".repeat(60));
  console.log(`Running ${agentTests.length} tests\n`);
  
  for (const testCase of agentTests) {
    console.log(`\nQuery: "${testCase.query}"`);
    const result = await runTest(testCase);
    
    console.log(`Response Time: ${result.responseTime}ms`);
    
    if (result.governanceBlocked) {
      console.log(`Status: GOVERNANCE_BLOCKED (expected for supervised agents)`);
      console.log(`Reason: ${result.response?.content}`);
    } else if (result.success) {
      console.log(`Status: SUCCESS`);
      console.log(`Action: ${result.response?.action}`);
      console.log(`Confidence: ${result.response?.confidenceScore}`);
      if (result.response?.content) {
        const preview = result.response.content.substring(0, 200);
        console.log(`Response: ${preview}${result.response.content.length > 200 ? "..." : ""}`);
      }
    } else {
      console.log(`Status: FAILED`);
      console.log(`Error: ${result.error || result.response?.error}`);
    }
  }
}

const command = process.argv[2] || "all";
const arg1 = process.argv[3];
const arg2 = parseInt(process.argv[4]) || 10;

switch (command) {
  case "all":
    runAllTests(parseInt(arg1) || 2);
    break;
  case "stress":
    runStressTest(parseInt(arg1) || 1, arg2);
    break;
  case "status":
    checkAgentStatus();
    break;
  case "agent":
    if (arg1) {
      runSingleAgent(arg1);
    } else {
      console.log("Usage: npx tsx scripts/test-agents.ts agent <agent_type>");
      console.log("Available agents: storm, load_forecast, grid_topology, capacity, supervisor");
    }
    break;
  default:
    console.log("Agent Test Suite");
    console.log("================");
    console.log("\nUsage:");
    console.log("  npx tsx scripts/test-agents.ts all [concurrency]     - Run all tests");
    console.log("  npx tsx scripts/test-agents.ts agent <type>          - Test single agent");
    console.log("  npx tsx scripts/test-agents.ts stress [qps] [secs]   - Run stress test");
    console.log("  npx tsx scripts/test-agents.ts status                - Check agent status");
    console.log("\nAgent Types:");
    console.log("  storm, load_forecast, grid_topology, capacity, supervisor");
}
