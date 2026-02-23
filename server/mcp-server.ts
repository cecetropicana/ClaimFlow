import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { agentOrchestrator } from "./agents";
import { storage } from "./storage";
import { settingsStore } from "./settings";
import { db } from "./db";
import { approvalQueue } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const server = new Server(
  {
    name: "claimflow-insurance-claims",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "triage_claim",
        description: "Classify claim severity, assess damage, and score priority for insurance claims.",
        inputSchema: {
          type: "object",
          properties: {
            claimId: {
              type: "string",
              description: "Specific claim ID to triage",
            },
            region: {
              type: "string",
              description: "Region code (e.g., 'FL', 'TX', 'LA')",
            },
            severity: {
              type: "string",
              description: "Claim severity level (critical, high, medium, low)",
            },
            damageType: {
              type: "string",
              description: "Type of damage (wind, flood, hail, fire, etc.)",
            },
          },
        },
      },
      {
        name: "analyze_backlog",
        description: "Analyze claims queue metrics, identify bottlenecks, and forecast throughput.",
        inputSchema: {
          type: "object",
          properties: {
            region: {
              type: "string",
              description: "Region code for backlog analysis",
            },
            stormEventId: {
              type: "string",
              description: "Storm event ID to filter backlog by",
            },
            timeRange: {
              type: "string",
              description: "Time range for analysis (e.g., '7d', '30d', '90d')",
              default: "current",
            },
            severity: {
              type: "string",
              description: "Filter by severity level",
            },
          },
        },
      },
      {
        name: "manage_adjusters",
        description: "Optimize adjuster assignments, balance workloads, and match specialties to claims.",
        inputSchema: {
          type: "object",
          properties: {
            adjusterId: {
              type: "string",
              description: "Specific adjuster ID to manage",
            },
            region: {
              type: "string",
              description: "Region for adjuster management",
            },
            specialty: {
              type: "string",
              description: "Adjuster specialty type",
            },
            claimCount: {
              type: "number",
              description: "Number of claims to assign",
            },
          },
        },
      },
      {
        name: "assess_storm",
        description: "Analyze storm impacts, estimate losses, cluster claims by storm event, and recommend response levels.",
        inputSchema: {
          type: "object",
          properties: {
            stormId: {
              type: "string",
              description: "Storm event ID to assess",
            },
            region: {
              type: "string",
              description: "Region affected by storm",
            },
            category: {
              type: "string",
              description: "Storm category (e.g., 'major', 'minor')",
            },
            severity: {
              type: "string",
              description: "Storm severity level",
            },
          },
        },
      },
      {
        name: "chat_with_agent",
        description: "Send a natural language query to the AI-powered multi-agent system. Automatically routes to the appropriate specialist agent (Claims Triage, Backlog Analysis, Adjuster Management, or Storm Assessment).",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Natural language query about insurance claims management",
            },
          },
          required: ["message"],
        },
      },
      {
        name: "get_agent_status",
        description: "Get the status and metrics of all agents in the system, including trust levels and performance data.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_pending_approvals",
        description: "Get list of agent actions pending human approval.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "approve_action",
        description: "Approve or reject a pending agent action.",
        inputSchema: {
          type: "object",
          properties: {
            approvalId: {
              type: "number",
              description: "ID of the approval request",
            },
            decision: {
              type: "string",
              enum: ["approved", "rejected"],
              description: "Whether to approve or reject",
            },
            reviewerId: {
              type: "string",
              description: "Name or ID of the person approving/rejecting",
            },
            reviewNotes: {
              type: "string",
              description: "Notes explaining the decision",
            },
          },
          required: ["approvalId", "decision", "reviewerId"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const isMockData = settingsStore.get().useMockData;

  try {
    switch (name) {
      case "triage_claim": {
        const { claimId, region, severity, damageType } = args as {
          claimId?: string;
          region?: string;
          severity?: string;
          damageType?: string;
        };
        const query = `Triage claim ${claimId || ''} in region ${region || 'all'} with severity ${severity || 'unknown'} and damage type ${damageType || 'unknown'}`;
        const result = await agentOrchestrator.processQuery(query);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ...result, isMockData }, null, 2),
            },
          ],
        };
      }

      case "analyze_backlog": {
        const { region, stormEventId, timeRange, severity } = args as {
          region?: string;
          stormEventId?: string;
          timeRange?: string;
          severity?: string;
        };
        const query = `Analyze claims backlog for region ${region || 'all'} ${stormEventId ? `storm ${stormEventId}` : ''} time range ${timeRange || 'current'} severity ${severity || 'all'}`;
        const result = await agentOrchestrator.processQuery(query);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ...result, isMockData }, null, 2),
            },
          ],
        };
      }

      case "manage_adjusters": {
        const { adjusterId, region, specialty, claimCount } = args as {
          adjusterId?: string;
          region?: string;
          specialty?: string;
          claimCount?: number;
        };
        const query = `Manage adjuster ${adjusterId || 'all'} in region ${region || 'all'} specialty ${specialty || 'all'} claim count ${claimCount || 'unknown'}`;
        const result = await agentOrchestrator.processQuery(query);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ...result, isMockData }, null, 2),
            },
          ],
        };
      }

      case "assess_storm": {
        const { stormId, region, category, severity } = args as {
          stormId?: string;
          region?: string;
          category?: string;
          severity?: string;
        };
        const query = `Assess storm ${stormId || ''} in region ${region || 'all'} category ${category || 'unknown'} severity ${severity || 'unknown'}`;
        const result = await agentOrchestrator.processQuery(query);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ...result, isMockData }, null, 2),
            },
          ],
        };
      }

      case "chat_with_agent": {
        const message = (args as { message: string }).message;
        const result = await agentOrchestrator.processQuery(message);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ...result, isMockData }, null, 2),
            },
          ],
        };
      }

      case "get_agent_status": {
        const status = await agentOrchestrator.getAgentStatus();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      case "get_pending_approvals": {
        const approvals = await db
          .select()
          .from(approvalQueue)
          .where(eq(approvalQueue.status, "pending"))
          .orderBy(desc(approvalQueue.createdAt));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(approvals, null, 2),
            },
          ],
        };
      }

      case "approve_action": {
        const { approvalId, decision, reviewerId, reviewNotes } = args as {
          approvalId: number;
          decision: "approved" | "rejected";
          reviewerId: string;
          reviewNotes?: string;
        };
        const [updated] = await db
          .update(approvalQueue)
          .set({
            status: decision,
            reviewedBy: reviewerId,
            reviewNotes: reviewNotes || null,
            reviewedAt: new Date(),
          })
          .where(eq(approvalQueue.id, approvalId))
          .returning();

        if (updated) {
          const { syncService } = await import("./agents/sync-service");
          await syncService.queueForSync({
            correlationId: updated.correlationId,
            agentId: updated.agentId,
            action: updated.action,
            payload: updated.context,
            decision: decision,
            success: decision === "approved",
          });
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(updated, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
});

export async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP server started on stdio");
}

export { server };
