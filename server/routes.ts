import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { settingsStore } from "./settings";
import { averecionClient } from "./agents/averecion-client";
import { 
  claimsFilterSchema,
  bulkAssignRequestSchema,
  claimStatusEnum
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Chat endpoint - processes natural language and returns appropriate analysis
  app.post("/api/chat", async (req, res) => {
    try {
      const { content } = req.body;
      
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Message content is required" });
      }

      const lowerContent = content.toLowerCase();
      
      const claimNumberMatch = content.match(/CLM-\d{4}-\d{5}/i);
      if (lowerContent.includes("claim") && claimNumberMatch) {
        const claimNumber = claimNumberMatch[0].toUpperCase();
        const claim = await storage.getClaimByNumber(claimNumber);
        
        if (claim) {
          return res.json({
            id: `msg-${Date.now()}`,
            content: `I found claim ${claimNumber}. Here are the details:`,
            cardType: "claim-detail",
            cardData: claim,
            isMockData: settingsStore.isMockDataEnabled()
          });
        } else {
          return res.json({
            id: `msg-${Date.now()}`,
            content: `I couldn't find a claim with number ${claimNumber}. Please verify the claim number and try again.`,
            cardType: "text"
          });
        }
      }
      
      if (lowerContent.includes("backlog") || lowerContent.includes("queue") || lowerContent.includes("unassigned")) {
        const metrics = await storage.getDashboardMetrics();
        
        return res.json({
          id: `msg-${Date.now()}`,
          content: `Here's the current claims backlog overview:`,
          cardType: "backlog-stats",
          cardData: metrics,
          isMockData: settingsStore.isMockDataEnabled()
        });
      }
      
      if (lowerContent.includes("storm") || lowerContent.includes("hurricane")) {
        const stormEvents = await storage.getStormEvents();
        const metrics = await storage.getDashboardMetrics();
        
        return res.json({
          id: `msg-${Date.now()}`,
          content: `Here's a summary of storm events and related claims:`,
          cardType: "storm-claims",
          cardData: { stormEvents, claimsByStorm: metrics.claimsByStorm },
          isMockData: settingsStore.isMockDataEnabled()
        });
      }
      
      if (lowerContent.includes("adjuster") || lowerContent.includes("workload") || lowerContent.includes("caseload")) {
        const workload = await storage.getAdjusterWorkload();
        
        return res.json({
          id: `msg-${Date.now()}`,
          content: `Here's the current adjuster workload breakdown:`,
          cardType: "adjuster-workload",
          cardData: workload,
          isMockData: settingsStore.isMockDataEnabled()
        });
      }
      
      if (lowerContent.includes("assign")) {
        const countMatch = content.match(/(\d+)\s*(claim|claims)/i);
        const count = countMatch ? parseInt(countMatch[1]) : null;
        
        return res.json({
          id: `msg-${Date.now()}`,
          content: count
            ? `To assign ${count} claims, use the bulk assignment feature. Navigate to the claims list, select the claims you want to assign, and choose an adjuster from the assignment panel. You can also use the API endpoint POST /api/claims/bulk-assign with the claim IDs and adjuster ID.`
            : `To assign claims to adjusters, you can use the claims list to select individual or multiple claims and assign them. Available adjusters and their current workloads can be viewed in the Adjusters section.`,
          cardType: "text"
        });
      }
      
      return res.json({
        id: `msg-${Date.now()}`,
        content: `I can help you with insurance claims management. Here's what I can do:

**Claim Lookup**: Say "Show me claim CLM-2026-00001" to look up a specific claim.

**Backlog Overview**: Say "Show me the backlog" or "What's unassigned?" to see claims queue metrics.

**Storm Claims**: Say "Show storm claims" or "Hurricane damage summary" to see storm-related claims data.

**Adjuster Workload**: Say "Show adjuster workload" or "Check caseloads" to see adjuster assignments.

**Assignment Help**: Say "Assign 5 claims" for guidance on bulk assignment.

What would you like to know?`,
        cardType: "text"
      });
      
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // ============================================================
  // INSURANCE CLAIMS ENDPOINTS
  // ============================================================

  app.get("/api/claims", async (req, res) => {
    try {
      const filter: Record<string, any> = {};
      if (req.query.stormEventId) filter.stormEventId = req.query.stormEventId as string;
      if (req.query.severity) filter.severity = req.query.severity as string;
      if (req.query.status) filter.status = req.query.status as string;
      if (req.query.damageType) filter.damageType = req.query.damageType as string;
      if (req.query.assignedAdjusterId) filter.assignedAdjusterId = req.query.assignedAdjusterId as string;
      if (req.query.region) filter.region = req.query.region as string;
      if (req.query.unassignedOnly === "true") filter.unassignedOnly = true;
      if (req.query.sortBy) filter.sortBy = req.query.sortBy as string;
      if (req.query.sortOrder) filter.sortOrder = req.query.sortOrder as string;

      const parsed = claimsFilterSchema.safeParse(filter);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid filter parameters", details: parsed.error.errors });
      }

      const claims = await storage.getClaims(parsed.data);
      res.json(claims);
    } catch (error) {
      console.error("Get claims error:", error);
      res.status(500).json({ error: "Failed to get claims" });
    }
  });

  app.get("/api/claims/:id", async (req, res) => {
    try {
      const claim = await storage.getClaim(req.params.id);
      if (!claim) {
        return res.status(404).json({ error: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      console.error("Get claim error:", error);
      res.status(500).json({ error: "Failed to get claim" });
    }
  });

  app.patch("/api/claims/:id/status", async (req, res) => {
    try {
      const statusSchema = z.object({ status: claimStatusEnum });
      const parsed = statusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid status", details: parsed.error.errors });
      }

      const performedBy = typeof req.body.performedBy === "string" ? req.body.performedBy : "Claims Agent";
      const updated = await storage.updateClaimStatus(req.params.id, parsed.data.status, performedBy, "claims_agent");
      if (!updated) {
        return res.status(404).json({ error: "Claim not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update claim status error:", error);
      res.status(500).json({ error: "Failed to update claim status" });
    }
  });

  app.post("/api/claims/:id/assign", async (req, res) => {
    try {
      const assignSchema = z.object({ adjusterId: z.string(), force: z.boolean().optional(), performedBy: z.string().optional() });
      const parsed = assignSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const adjuster = await storage.getAdjuster(parsed.data.adjusterId);
      if (!adjuster) {
        return res.status(404).json({ error: "Adjuster not found" });
      }

      if (!parsed.data.force) {
        if (adjuster.status === "unavailable") {
          return res.status(409).json({ 
            error: "Adjuster is currently unavailable",
            warning: "unavailable",
            adjusterName: adjuster.name,
            adjusterStatus: adjuster.status,
          });
        }
        if (adjuster.currentCaseload >= adjuster.maxCaseload) {
          return res.status(409).json({ 
            error: `${adjuster.name} is at full capacity (${adjuster.currentCaseload}/${adjuster.maxCaseload} claims)`,
            warning: "at_capacity",
            adjusterName: adjuster.name,
            currentCaseload: adjuster.currentCaseload,
            maxCaseload: adjuster.maxCaseload,
          });
        }
      }

      const updated = await storage.assignClaim(req.params.id, parsed.data.adjusterId, parsed.data.performedBy);
      if (!updated) {
        return res.status(404).json({ error: "Claim or adjuster not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Assign claim error:", error);
      res.status(500).json({ error: "Failed to assign claim" });
    }
  });

  app.post("/api/claims/bulk-assign", async (req, res) => {
    try {
      const bulkSchema = bulkAssignRequestSchema.extend({ force: z.boolean().optional() });
      const parsed = bulkSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const adjuster = await storage.getAdjuster(parsed.data.adjusterId);
      if (!adjuster) {
        return res.status(404).json({ error: "Adjuster not found" });
      }

      if (!parsed.data.force) {
        if (adjuster.status === "unavailable") {
          return res.status(409).json({ 
            error: "Adjuster is currently unavailable",
            warning: "unavailable",
            adjusterName: adjuster.name,
          });
        }
        const remainingCapacity = adjuster.maxCaseload - adjuster.currentCaseload;
        if (remainingCapacity < parsed.data.claimIds.length) {
          return res.status(409).json({ 
            error: `${adjuster.name} only has capacity for ${remainingCapacity} more claims (requesting ${parsed.data.claimIds.length})`,
            warning: "insufficient_capacity",
            adjusterName: adjuster.name,
            remainingCapacity,
            requestedCount: parsed.data.claimIds.length,
          });
        }
      }

      const results = await storage.bulkAssignClaims(parsed.data.claimIds, parsed.data.adjusterId);
      res.json(results);
    } catch (error) {
      console.error("Bulk assign error:", error);
      res.status(500).json({ error: "Failed to bulk assign claims" });
    }
  });

  app.post("/api/claims/bulk-status", async (req, res) => {
    try {
      const bulkStatusSchema = z.object({
        claimIds: z.array(z.string()).min(1),
        status: claimStatusEnum,
      });
      const parsed = bulkStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const results = [];
      for (const id of parsed.data.claimIds) {
        const updated = await storage.updateClaimStatus(id, parsed.data.status);
        if (updated) results.push(updated);
      }
      res.json({ updated: results.length, claims: results });
    } catch (error) {
      console.error("Bulk status update error:", error);
      res.status(500).json({ error: "Failed to bulk update claim status" });
    }
  });

  app.get("/api/claims/:id/notes", async (req, res) => {
    try {
      const notes = await storage.getClaimNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      console.error("Get claim notes error:", error);
      res.status(500).json({ error: "Failed to get claim notes" });
    }
  });

  app.post("/api/claims/:id/notes", async (req, res) => {
    try {
      const noteSchema = z.object({
        authorName: z.string(),
        authorRole: z.string(),
        content: z.string(),
      });
      const parsed = noteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error.errors });
      }

      const note = await storage.addClaimNote({
        claimId: req.params.id,
        authorName: parsed.data.authorName,
        authorRole: parsed.data.authorRole,
        content: parsed.data.content,
      });
      res.json(note);
    } catch (error) {
      console.error("Add claim note error:", error);
      res.status(500).json({ error: "Failed to add claim note" });
    }
  });

  app.get("/api/claims/:id/activity", async (req, res) => {
    try {
      const activity = await storage.getClaimActivity(req.params.id);
      res.json(activity);
    } catch (error) {
      console.error("Get claim activity error:", error);
      res.status(500).json({ error: "Failed to get claim activity" });
    }
  });

  app.get("/api/activity", async (req, res) => {
    try {
      const all = await storage.getAllActivity();
      const agentId = req.query.agentId as string | undefined;
      if (agentId) {
        const filtered = all.filter(a => a.performedBy.toLowerCase().includes(agentId.replace(/-/g, " ").toLowerCase()) || a.performedBy === agentId);
        return res.json(filtered);
      }
      res.json(all);
    } catch (error) {
      console.error("Get all activity error:", error);
      res.status(500).json({ error: "Failed to get activity" });
    }
  });

  app.get("/api/storm-events", async (req, res) => {
    try {
      const events = await storage.getStormEvents();
      res.json(events);
    } catch (error) {
      console.error("Get storm events error:", error);
      res.status(500).json({ error: "Failed to get storm events" });
    }
  });

  app.get("/api/storm-events/:id", async (req, res) => {
    try {
      const event = await storage.getStormEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Storm event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Get storm event error:", error);
      res.status(500).json({ error: "Failed to get storm event" });
    }
  });

  app.get("/api/adjusters/workload", async (req, res) => {
    try {
      const workload = await storage.getAdjusterWorkload();
      res.json(workload);
    } catch (error) {
      console.error("Get adjuster workload error:", error);
      res.status(500).json({ error: "Failed to get adjuster workload" });
    }
  });

  app.get("/api/adjusters", async (req, res) => {
    try {
      const adjusters = await storage.getAdjusters();
      res.json(adjusters);
    } catch (error) {
      console.error("Get adjusters error:", error);
      res.status(500).json({ error: "Failed to get adjusters" });
    }
  });

  app.get("/api/adjusters/:id", async (req, res) => {
    try {
      const adjuster = await storage.getAdjuster(req.params.id);
      if (!adjuster) {
        return res.status(404).json({ error: "Adjuster not found" });
      }
      res.json(adjuster);
    } catch (error) {
      console.error("Get adjuster error:", error);
      res.status(500).json({ error: "Failed to get adjuster" });
    }
  });

  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Get dashboard metrics error:", error);
      res.status(500).json({ error: "Failed to get dashboard metrics" });
    }
  });

  // ============================================================
  // SETTINGS ROUTES
  // ============================================================

  // Get app settings
  app.get("/api/settings", (req, res) => {
    res.json(settingsStore.get());
  });

  // Update settings (toggle mock data mode)
  app.patch("/api/settings", (req, res) => {
    try {
      const { useMockData } = req.body;
      
      if (typeof useMockData === "boolean") {
        if (useMockData) {
          settingsStore.enableMockData();
        } else {
          settingsStore.disableMockData();
        }
      }
      
      res.json(settingsStore.get());
    } catch (error) {
      console.error("Settings update error:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // ============================================================
  // AGENT SYSTEM ROUTES
  // ============================================================

  // Agent-powered chat endpoint (uses multi-agent architecture)
  app.post("/api/agent/chat", async (req, res) => {
    try {
      const { agentOrchestrator } = await import("./agents");
      const { content, conversationHistory = [] } = req.body;
      
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Message content is required" });
      }

      const result = await agentOrchestrator.processQuery(content, conversationHistory);
      
      res.json({
        id: `msg-${Date.now()}`,
        success: result.success,
        content: result.success 
          ? (result.data as any)?.response || (result.data as any)?.analysis || JSON.stringify(result.data)
          : result.error,
        action: result.action,
        confidenceScore: result.confidenceScore,
        latencyMs: result.latencyMs,
        tokenUsage: result.tokenUsage,
      });
    } catch (error) {
      console.error("Agent chat error:", error);
      res.status(500).json({ error: "Failed to process agent request" });
    }
  });

  // Get agent status and metrics
  app.get("/api/agent/status", async (req, res) => {
    try {
      const { agentOrchestrator } = await import("./agents");
      const { agentCache } = await import("./agents/cache");
      const status = await agentOrchestrator.getAgentStatus();
      const cacheStats = agentCache.getStats();
      res.json({ agents: status, cache: cacheStats });
    } catch (error) {
      console.error("Agent status error:", error);
      res.status(500).json({ error: "Failed to get agent status" });
    }
  });

  // Get autonomy status and promotion eligibility
  app.get("/api/agent/autonomy", async (req, res) => {
    try {
      const { autonomyTracker } = await import("./agents/autonomy-tracker");
      const status = await autonomyTracker.getAutonomyStatus();
      res.json({ autonomy: status });
    } catch (error) {
      console.error("Autonomy status error:", error);
      res.status(500).json({ error: "Failed to get autonomy status" });
    }
  });

  // Promote agent to next trust level
  app.post("/api/agent/:agentId/promote", async (req, res) => {
    try {
      const { autonomyTracker } = await import("./agents/autonomy-tracker");
      const { agentId } = req.params;
      const result = await autonomyTracker.promoteAgent(agentId);
      res.json(result);
    } catch (error) {
      console.error("Agent promotion error:", error);
      res.status(500).json({ error: "Failed to promote agent" });
    }
  });

  // Set agent trust level (for testing)
  app.post("/api/agent/:agentId/trust-level", async (req, res) => {
    try {
      const { autonomyTracker } = await import("./agents/autonomy-tracker");
      const { agentId } = req.params;
      const { level } = req.body;
      
      if (!level) {
        return res.status(400).json({ error: "Trust level is required" });
      }
      
      const result = await autonomyTracker.setTrustLevel(agentId, level);
      res.json(result);
    } catch (error) {
      console.error("Set trust level error:", error);
      res.status(500).json({ error: "Failed to set trust level" });
    }
  });

  // Get audit logs for agent actions
  app.get("/api/agent/audit-logs", async (req, res) => {
    try {
      const { db } = await import("./db");
      const { auditLogs } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");
      
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
      
      res.json({ logs });
    } catch (error) {
      console.error("Audit logs error:", error);
      res.status(500).json({ error: "Failed to get audit logs" });
    }
  });

  app.get("/api/agent/approvals", async (req, res) => {
    try {
      const { db } = await import("./db");
      const { approvalQueue } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");

      const status = req.query.status as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

      let query = db.select().from(approvalQueue);

      if (status && ["pending", "approved", "rejected"].includes(status)) {
        query = query.where(eq(approvalQueue.status, status)) as typeof query;
      }

      const results = await query
        .orderBy(desc(approvalQueue.createdAt))
        .limit(limit);

      res.json({ approvals: results });
    } catch (error) {
      console.error("Approvals error:", error);
      res.status(500).json({ error: "Failed to get approvals" });
    }
  });

  // ============================================================
  // GOVERNED CHAT V2 ENDPOINT (with streaming & confidence)
  // ============================================================

  app.post("/api/v2/chat", async (req, res) => {
    try {
      const { agentOrchestrator } = await import("./agents");
      const { content, conversationHistory = [], stream = false } = req.body;
      
      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "Message content is required" });
      }

      const startTime = Date.now();
      const correlationId = crypto.randomUUID();

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        
        res.write(`data: ${JSON.stringify({ type: "start", correlationId })}\n\n`);

        const result = await agentOrchestrator.processQuery(content, conversationHistory);
        const latencyMs = Date.now() - startTime;

        const responseContent = result.success 
          ? (result.data as any)?.response || (result.data as any)?.analysis || JSON.stringify(result.data)
          : result.error;

        const chunks = responseContent.match(/.{1,100}/g) || [responseContent];
        for (const chunk of chunks) {
          res.write(`data: ${JSON.stringify({ type: "chunk", correlationId, content: chunk })}\n\n`);
          await new Promise(r => setTimeout(r, 10));
        }

        res.write(`data: ${JSON.stringify({
          type: "complete",
          correlationId,
          id: `msg-${Date.now()}`,
          success: result.success,
          action: result.action,
          confidenceScore: result.confidenceScore,
          latencyMs,
          tokenUsage: result.tokenUsage,
          governanceStatus: result.governanceStatus || "approved",
        })}\n\n`);

        res.end();
      } else {
        const result = await agentOrchestrator.processQuery(content, conversationHistory);
        const latencyMs = Date.now() - startTime;

        res.json({
          id: `msg-${Date.now()}`,
          correlationId,
          success: result.success,
          content: result.success 
            ? (result.data as any)?.response || (result.data as any)?.analysis || JSON.stringify(result.data)
            : result.error,
          action: result.action,
          confidenceScore: result.confidenceScore || 0,
          latencyMs,
          tokenUsage: result.tokenUsage,
          governanceStatus: result.governanceStatus || "approved",
          metadata: {
            agentType: result.agentType,
            trustLevel: result.trustLevel,
          },
        });
      }
    } catch (error) {
      console.error("V2 Chat error:", error);
      res.status(500).json({ 
        error: "Failed to process request",
        correlationId: crypto.randomUUID(),
      });
    }
  });

  // ============================================================
  // DATA INTEGRATION ROUTES
  // ============================================================

  app.get("/api/data-sources", async (req, res) => {
    try {
      const { dataSourceManager } = await import("./data-integrations");
      const sources = dataSourceManager.getAllSources();
      const schema = dataSourceManager.getDataSourceSchema();
      res.json({ sources, schema });
    } catch (error) {
      console.error("Data sources error:", error);
      res.status(500).json({ error: "Failed to get data sources" });
    }
  });

  app.post("/api/data-sources", async (req, res) => {
    try {
      const { dataSourceManager } = await import("./data-integrations");
      const config = req.body;
      
      if (!config.id || !config.name || !config.type) {
        return res.status(400).json({ error: "id, name, and type are required" });
      }

      dataSourceManager.registerSource({
        ...config,
        enabled: config.enabled ?? true,
        status: "disconnected",
      });

      res.json({ success: true, message: "Data source registered" });
    } catch (error) {
      console.error("Register data source error:", error);
      res.status(500).json({ error: "Failed to register data source" });
    }
  });

  app.post("/api/data-sources/:id/test", async (req, res) => {
    try {
      const { dataSourceManager } = await import("./data-integrations");
      const { id } = req.params;
      
      const result = await dataSourceManager.testConnection(id);
      res.json(result);
    } catch (error) {
      console.error("Test connection error:", error);
      res.status(500).json({ error: "Failed to test connection" });
    }
  });

  // Get agent connection status including Averecion API
  app.get("/api/agent/connection-status", async (req, res) => {
    try {
      const { averecionClient } = await import("./agents/averecion-client");
      const { db } = await import("./db");
      const { agentMetrics } = await import("@shared/schema");
      
      // Check Averecion API connection
      const averecionStatus = await averecionClient.checkConnection();
      
      // Define all agents in the system (using actual agent IDs that match the orchestrator)
      const agentDefinitions = [
        { id: "supervisor-agent", name: "Supervisor Agent", type: "supervisor", description: "Routes queries to specialized agents" },
        { id: "claims-triage-agent", name: "Claims Triage Agent", type: "claims_triage", description: "Classifies claim severity, assesses damage, scores priority" },
        { id: "backlog-analysis-agent", name: "Backlog Analysis Agent", type: "backlog_analysis", description: "Analyzes backlog metrics, queue throughput, bottlenecks" },
        { id: "adjuster-management-agent", name: "Adjuster Management Agent", type: "adjuster_management", description: "Optimizes adjuster assignments and workload balancing" },
        { id: "storm-assessment-agent", name: "Storm Assessment Agent", type: "storm_assessment", description: "Analyzes storm impacts, estimates losses, clusters claims" },
      ];
      
      // Get metrics from database for each agent
      const metricsResults = await db.select().from(agentMetrics);
      const metricsMap = new Map(metricsResults.map(m => [m.agentId, m]));
      
      // Build status for each agent, including any from database not in definitions
      const definitionIds = new Set(agentDefinitions.map(a => a.id));
      const agents = agentDefinitions.map(agent => {
        const metrics = metricsMap.get(agent.id);
        const total = metrics?.totalDecisions || 0;
        const successful = metrics?.successfulDecisions || 0;
        const successRate = total > 0 ? (successful / total) * 100 : 100;
        return {
          ...agent,
          status: "active",
          trustLevel: metrics?.trustLevel || "supervised",
          trustScore: metrics?.trustScore ? Number(metrics.trustScore) : 0.5,
          totalDecisions: total,
          successRate,
          lastActive: metrics?.lastActiveAt || null,
        };
      });
      
      // Add any agents from database not in predefined list
      for (const metrics of metricsResults) {
        if (!definitionIds.has(metrics.agentId)) {
          const total = metrics.totalDecisions || 0;
          const successful = metrics.successfulDecisions || 0;
          agents.push({
            id: metrics.agentId,
            name: metrics.agentId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            type: metrics.agentType,
            description: `${metrics.agentType} agent`,
            status: "active",
            trustLevel: metrics.trustLevel || "supervised",
            trustScore: metrics.trustScore ? Number(metrics.trustScore) : 0.5,
            totalDecisions: total,
            successRate: total > 0 ? (successful / total) * 100 : 100,
            lastActive: metrics.lastActiveAt || null,
          });
        }
      }
      
      // Get orchestrator status
      const orchestratorStatus = averecionClient.getOrchestratorStatus();
      
      // Get agent heartbeat status
      const agentHeartbeats = averecionClient.getAgentHeartbeatStatus();
      
      res.json({
        agents,
        orchestrator: {
          id: orchestratorStatus.orchestratorId,
          instanceId: orchestratorStatus.instanceId,
          heartbeatActive: orchestratorStatus.isHeartbeatRunning,
          lastHeartbeat: orchestratorStatus.lastHeartbeat,
          uptime: orchestratorStatus.uptime,
        },
        governance: {
          provider: "Averecion",
          configured: averecionStatus.configured,
          connected: averecionStatus.connected,
          latencyMs: averecionStatus.latencyMs,
          error: averecionStatus.error,
          mode: averecionStatus.configured ? "external" : "local",
        },
        heartbeats: agentHeartbeats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Connection status error:", error);
      res.status(500).json({ error: "Failed to get connection status" });
    }
  });

  // Approve or reject a pending action
  app.post("/api/agent/approvals/:id", async (req, res) => {
    try {
      const { db } = await import("./db");
      const { approvalQueue, agentMetrics } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const { id } = req.params;
      const { decision, reviewedBy, reviewNotes } = req.body;
      
      if (!decision || !["approved", "rejected"].includes(decision)) {
        return res.status(400).json({ error: "Decision must be 'approved' or 'rejected'" });
      }
      
      const [updated] = await db
        .update(approvalQueue)
        .set({
          status: decision,
          reviewedBy,
          reviewNotes,
          reviewedAt: new Date(),
        })
        .where(eq(approvalQueue.id, parseInt(id)))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Approval not found" });
      }
      
      // Record metrics for the agent after approval/rejection
      const agentId = updated.agentId;
      const success = decision === "approved";
      
      try {
        const [existing] = await db
          .select()
          .from(agentMetrics)
          .where(eq(agentMetrics.agentId, agentId));
        
        if (existing) {
          const newTotal = existing.totalDecisions + 1;
          const newSuccessful = success ? existing.successfulDecisions + 1 : existing.successfulDecisions;
          const newTrustScore = Math.min(1, (newSuccessful / newTotal) * Math.min(1, newTotal / 10));
          
          await db
            .update(agentMetrics)
            .set({
              totalDecisions: newTotal,
              successfulDecisions: newSuccessful,
              trustScore: newTrustScore,
              lastActiveAt: new Date(),
            })
            .where(eq(agentMetrics.agentId, agentId));
          
          console.log(`[Approval] Updated metrics for ${agentId}: ${newTotal} decisions, ${newSuccessful} successful`);
        } else {
          // Create new metrics entry for this agent
          const context = JSON.parse(updated.context || "{}");
          await db.insert(agentMetrics).values({
            agentId,
            agentType: context.agentType || "unknown",
            trustLevel: "supervised",
            trustScore: success ? 1 : 0,
            totalDecisions: 1,
            successfulDecisions: success ? 1 : 0,
            lastActiveAt: new Date(),
          });
          console.log(`[Approval] Created metrics for ${agentId}: 1 decision, ${success ? 1 : 0} successful`);
        }
        
        // Check for autonomy progression
        const { autonomyTracker } = await import("./agents/autonomy-tracker");
        await autonomyTracker.recordOutcome(agentId, success);
      } catch (metricsError) {
        console.error("[Approval] Failed to update metrics:", metricsError);
      }

      // Queue decision for sync to Averecion when it comes back online
      try {
        const { syncService } = await import("./agents/sync-service");
        await syncService.queueForSync({
          correlationId: updated.correlationId,
          agentId: updated.agentId,
          action: updated.action,
          payload: updated.context,
          decision: decision,
          success: decision === "approved",
        });
      } catch (syncError) {
        console.error("[Approval] Failed to queue for sync:", syncError);
      }

      res.json({ approval: updated });
    } catch (error) {
      console.error("Approval update error:", error);
      res.status(500).json({ error: "Failed to update approval" });
    }
  });

  // Agent performance comparison endpoint
  app.get("/api/agent/performance", async (req, res) => {
    try {
      const { db } = await import("./db");
      const { agentMetrics, approvalQueue } = await import("@shared/schema");
      const { eq, sql } = await import("drizzle-orm");

      const agentDefinitions = [
        { id: "supervisor-agent", name: "Supervisor Agent", type: "supervisor" },
        { id: "claims-triage-agent", name: "Claims Triage Agent", type: "claims_triage" },
        { id: "backlog-analysis-agent", name: "Backlog Analysis Agent", type: "backlog_analysis" },
        { id: "adjuster-management-agent", name: "Adjuster Management Agent", type: "adjuster_management" },
        { id: "storm-assessment-agent", name: "Storm Assessment Agent", type: "storm_assessment" },
      ];

      const metricsResults = await db.select().from(agentMetrics);
      const metricsMap = new Map(metricsResults.map(m => [m.agentId, m]));

      const approvalStats = await db
        .select({
          agentId: approvalQueue.agentId,
          status: approvalQueue.status,
          count: sql<number>`count(*)::int`,
        })
        .from(approvalQueue)
        .groupBy(approvalQueue.agentId, approvalQueue.status);

      const approvalMap = new Map<string, { approved: number; rejected: number; pending: number }>();
      for (const row of approvalStats) {
        if (!approvalMap.has(row.agentId)) {
          approvalMap.set(row.agentId, { approved: 0, rejected: 0, pending: 0 });
        }
        const entry = approvalMap.get(row.agentId)!;
        if (row.status === "approved") entry.approved = row.count;
        else if (row.status === "rejected") entry.rejected = row.count;
        else if (row.status === "pending") entry.pending = row.count;
      }

      const performance = agentDefinitions.map(agent => {
        const metrics = metricsMap.get(agent.id);
        const approvals = approvalMap.get(agent.id) || { approved: 0, rejected: 0, pending: 0 };
        const total = metrics?.totalDecisions || 0;
        const successful = metrics?.successfulDecisions || 0;
        const successRate = total > 0 ? (successful / total) * 100 : 0;

        return {
          id: agent.id,
          name: agent.name,
          type: agent.type,
          trustLevel: metrics?.trustLevel || "supervised",
          trustScore: metrics?.trustScore ? Number(metrics.trustScore) : 0,
          totalDecisions: total,
          successfulDecisions: successful,
          successRate: Math.round(successRate * 10) / 10,
          approvals: approvals.approved,
          rejections: approvals.rejected,
          pending: approvals.pending,
          lastActive: metrics?.lastActiveAt || null,
        };
      });

      res.json({ performance });
    } catch (error) {
      console.error("Agent performance error:", error);
      res.status(500).json({ error: "Failed to get agent performance" });
    }
  });

  // ============================================================
  // GOVERNANCE SYNC ENDPOINTS
  // ============================================================

  // Get sync status
  app.get("/api/agent/sync-status", async (req, res) => {
    try {
      const { syncService } = await import("./agents/sync-service");
      const status = await syncService.getDetailedStatus();
      res.json(status);
    } catch (error) {
      console.error("Sync status error:", error);
      res.status(500).json({ error: "Failed to get sync status" });
    }
  });

  // Trigger manual sync
  app.post("/api/agent/sync", async (req, res) => {
    try {
      const { syncService } = await import("./agents/sync-service");
      const result = await syncService.syncPending();
      res.json({ 
        success: true, 
        message: `Synced ${result.synced} decisions, ${result.failed} failed`,
        ...result 
      });
    } catch (error) {
      console.error("Manual sync error:", error);
      res.status(500).json({ error: "Failed to trigger sync" });
    }
  });

  // Retry failed sync items
  app.post("/api/agent/sync/retry-failed", async (req, res) => {
    try {
      const { syncService } = await import("./agents/sync-service");
      const result = await syncService.retryFailed();
      res.json({ 
        success: true, 
        message: `Reset ${result.reset} failed items for retry`,
        ...result 
      });
    } catch (error) {
      console.error("Retry failed error:", error);
      res.status(500).json({ error: "Failed to retry failed items" });
    }
  });

  // Get heartbeat status (includes per-agent heartbeat status)
  app.get("/api/agent/heartbeat-status", async (req, res) => {
    try {
      const systemStatus = averecionClient.getHeartbeatStatus();
      const agentStatuses = averecionClient.getAgentHeartbeatStatus();
      res.json({
        system: systemStatus,
        agents: agentStatuses,
      });
    } catch (error) {
      console.error("Heartbeat status error:", error);
      res.status(500).json({ error: "Failed to get heartbeat status" });
    }
  });

  // Manually register agents (can be called to re-register)
  app.post("/api/agent/register-all", async (req, res) => {
    try {
      const { agentOrchestrator } = await import("./agents/orchestrator");
      const result = await agentOrchestrator.registerAllAgents();
      res.json(result);
    } catch (error) {
      console.error("Agent registration error:", error);
      res.status(500).json({ error: "Failed to register agents" });
    }
  });

  // Manually trigger heartbeat
  app.post("/api/agent/heartbeat", async (req, res) => {
    try {
      const result = await averecionClient.sendHeartbeat();
      res.json(result);
    } catch (error) {
      console.error("Manual heartbeat error:", error);
      res.status(500).json({ error: "Failed to send heartbeat" });
    }
  });

  // Test high-risk actions for each agent
  app.get("/api/agent/test-high-risk", async (req, res) => {
    try {
      const { agentOrchestrator } = await import("./agents/orchestrator");
      
      const highRiskQueries = [
        {
          agent: "claims-triage-agent",
          query: "Triage critical severity claim for hurricane damage in coastal Florida region",
          description: "Tests triage_claim via Claims Triage Agent",
          expectedAction: "triage_claim"
        },
        {
          agent: "backlog-analysis-agent", 
          query: "Analyze the claims backlog for urgent unassigned claims in the Southeast region",
          description: "Tests analyze_backlog via Backlog Analysis Agent",
          expectedAction: "analyze_backlog"
        },
        {
          agent: "adjuster-management-agent",
          query: "Rebalance adjuster workloads for overloaded adjusters in the Gulf Coast region",
          description: "Tests manage_adjusters via Adjuster Management Agent",
          expectedAction: "manage_adjusters"
        },
        {
          agent: "storm-assessment-agent",
          query: "Assess hurricane impact and estimate losses for Category 4 storm in Southeast",
          description: "Tests assess_storm via Storm Assessment Agent", 
          expectedAction: "assess_storm"
        }
      ];

      res.json({
        message: "High-risk test queries for each agent",
        note: "POST these queries to /api/agent/chat to trigger action options flow",
        queries: highRiskQueries
      });
    } catch (error) {
      console.error("Test high-risk error:", error);
      res.status(500).json({ error: "Failed to get test queries" });
    }
  });

  // Execute a specific high-risk test
  app.post("/api/agent/test-high-risk/:testId", async (req, res) => {
    try {
      const { agentOrchestrator } = await import("./agents/orchestrator");
      const testId = parseInt(req.params.testId);
      
      const tests = [
        {
          query: "Bulk reassign 50 critical claims from overloaded adjusters in Florida coastal region",
          context: { claimCount: 50, region: "FL-coastal" }
        },
        {
          query: "Override triage score and escalate claim CLM-2847 to catastrophic severity",
          context: { claimId: "CLM-2847", newSeverity: "catastrophic" }
        },
        {
          query: "Approve emergency deployment of 15 adjusters to Hurricane Milton affected areas",
          context: { adjusterCount: 15, stormEvent: "Hurricane Milton" }
        },
        {
          query: "Process batch settlement for 200 low-severity claims under $10,000 estimated loss",
          context: { claimCount: 200, maxLoss: 10000 }
        },
        {
          query: "Suspend adjuster ADJ-005 pending investigation and redistribute their 12 active claims",
          context: { adjusterId: "ADJ-005", activeClaims: 12 }
        }
      ];

      if (testId < 0 || testId >= tests.length) {
        return res.status(400).json({ error: `Invalid test ID. Use 0-${tests.length - 1}` });
      }

      const test = tests[testId];
      console.log(`[Test] Executing high-risk test ${testId}: ${test.query}`);
      
      const result = await agentOrchestrator.processQuery(test.query, []);

      res.json({
        testId,
        query: test.query,
        result: {
          data: result.data,
          action: result.action,
          confidenceScore: result.confidenceScore,
          success: result.success,
          governanceStatus: result.governanceStatus,
          error: result.error
        }
      });
    } catch (error) {
      console.error("Execute high-risk test error:", error);
      res.status(500).json({ error: "Failed to execute test" });
    }
  });

  // Agent Actions API endpoints
  app.get("/api/agent/actions/alerts", async (req, res) => {
    try {
      const { actionHandler } = await import("./agents/action-handler");
      const limit = parseInt(req.query.limit as string) || 50;
      const alerts = await actionHandler.getRecentAlerts(limit);
      res.json(alerts);
    } catch (error) {
      console.error("Get alerts error:", error);
      res.status(500).json({ error: "Failed to get alerts" });
    }
  });

  app.get("/api/agent/actions/maintenance", async (req, res) => {
    try {
      const { actionHandler } = await import("./agents/action-handler");
      const limit = parseInt(req.query.limit as string) || 50;
      const maintenance = await actionHandler.getScheduledMaintenance(limit);
      res.json(maintenance);
    } catch (error) {
      console.error("Get maintenance error:", error);
      res.status(500).json({ error: "Failed to get scheduled maintenance" });
    }
  });

  app.get("/api/agent/actions/work-orders", async (req, res) => {
    try {
      const { actionHandler } = await import("./agents/action-handler");
      const limit = parseInt(req.query.limit as string) || 50;
      const workOrders = await actionHandler.getWorkOrders(limit);
      res.json(workOrders);
    } catch (error) {
      console.error("Get work orders error:", error);
      res.status(500).json({ error: "Failed to get work orders" });
    }
  });

  app.get("/api/agent/actions/asset-updates", async (req, res) => {
    try {
      const { actionHandler } = await import("./agents/action-handler");
      const limit = parseInt(req.query.limit as string) || 50;
      const updates = await actionHandler.getAssetStatusUpdates(limit);
      res.json(updates);
    } catch (error) {
      console.error("Get asset updates error:", error);
      res.status(500).json({ error: "Failed to get asset status updates" });
    }
  });

  app.get("/api/agent/actions/events", async (req, res) => {
    try {
      const { actionHandler } = await import("./agents/action-handler");
      const limit = parseInt(req.query.limit as string) || 100;
      const events = await actionHandler.getEventLog(limit);
      res.json(events);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ error: "Failed to get event log" });
    }
  });

  app.get("/api/agent/actions/notifications", async (req, res) => {
    try {
      const { actionHandler } = await import("./agents/action-handler");
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await actionHandler.getNotifications(limit);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  app.get("/api/agent/actions/summary", async (req, res) => {
    try {
      const { actionHandler } = await import("./agents/action-handler");
      const [alerts, maintenance, workOrders, assetUpdates, events, notifications] = await Promise.all([
        actionHandler.getRecentAlerts(10),
        actionHandler.getScheduledMaintenance(10),
        actionHandler.getWorkOrders(10),
        actionHandler.getAssetStatusUpdates(10),
        actionHandler.getEventLog(20),
        actionHandler.getNotifications(10)
      ]);
      
      res.json({
        alerts: { count: alerts.length, recent: alerts },
        maintenance: { count: maintenance.length, recent: maintenance },
        workOrders: { count: workOrders.length, recent: workOrders },
        assetUpdates: { count: assetUpdates.length, recent: assetUpdates },
        events: { count: events.length, recent: events },
        notifications: { count: notifications.length, recent: notifications }
      });
    } catch (error) {
      console.error("Get actions summary error:", error);
      res.status(500).json({ error: "Failed to get actions summary" });
    }
  });

  const alertActionSchema = z.object({
    acknowledgedBy: z.string().optional(),
    resolvedBy: z.string().optional(),
  });

  const workOrderStatusSchema = z.object({
    status: z.enum(["open", "assigned", "in_progress", "completed", "cancelled"]),
    actualHours: z.number().positive().optional(),
  });

  const maintenanceStatusSchema = z.object({
    status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  });

  app.post("/api/agent/actions/alerts/:id/acknowledge", async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      if (isNaN(alertId) || alertId <= 0) {
        return res.status(400).json({ error: "Invalid alert ID" });
      }
      
      const parsed = alertActionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      
      const { actionHandler } = await import("./agents/action-handler");
      const result = await actionHandler.acknowledgeAlert(alertId, parsed.data.acknowledgedBy || "user");
      
      if (!result.success) {
        return res.status(404).json({ error: result.error || "Alert not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Acknowledge alert error:", error);
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });

  app.post("/api/agent/actions/alerts/:id/resolve", async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      if (isNaN(alertId) || alertId <= 0) {
        return res.status(400).json({ error: "Invalid alert ID" });
      }
      
      const parsed = alertActionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      
      const { actionHandler } = await import("./agents/action-handler");
      const result = await actionHandler.resolveAlert(alertId, parsed.data.resolvedBy || "user");
      
      if (!result.success) {
        return res.status(404).json({ error: result.error || "Alert not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Resolve alert error:", error);
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  });

  app.post("/api/agent/actions/work-orders/:id/status", async (req, res) => {
    try {
      const workOrderId = parseInt(req.params.id);
      if (isNaN(workOrderId) || workOrderId <= 0) {
        return res.status(400).json({ error: "Invalid work order ID" });
      }
      
      const parsed = workOrderStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      }
      
      const { actionHandler } = await import("./agents/action-handler");
      const result = await actionHandler.updateWorkOrderStatus(workOrderId, parsed.data.status, parsed.data.actualHours);
      
      if (!result.success) {
        return res.status(404).json({ error: result.error || "Work order not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Update work order status error:", error);
      res.status(500).json({ error: "Failed to update work order status" });
    }
  });

  app.post("/api/agent/actions/maintenance/:id/status", async (req, res) => {
    try {
      const maintenanceId = parseInt(req.params.id);
      if (isNaN(maintenanceId) || maintenanceId <= 0) {
        return res.status(400).json({ error: "Invalid maintenance ID" });
      }
      
      const parsed = maintenanceStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      }
      
      const { actionHandler } = await import("./agents/action-handler");
      const result = await actionHandler.updateMaintenanceStatus(maintenanceId, parsed.data.status);
      
      if (!result.success) {
        return res.status(404).json({ error: result.error || "Maintenance record not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Update maintenance status error:", error);
      res.status(500).json({ error: "Failed to update maintenance status" });
    }
  });

  // Development: Reset all agent data (for testing purposes)
  app.post("/api/agent/reset", async (req, res) => {
    try {
      const { db } = await import("./db");
      const { 
        auditLogs, agentMetrics, approvalQueue, governanceSyncQueue,
        agentAlerts, scheduledMaintenance, workOrders, assetStatusUpdates, eventLog, notifications 
      } = await import("@shared/schema");
      
      // Clear all agent-related tables
      await db.delete(auditLogs);
      await db.delete(agentMetrics);
      await db.delete(approvalQueue);
      await db.delete(governanceSyncQueue);
      
      // Clear agent action tables
      await db.delete(agentAlerts);
      await db.delete(scheduledMaintenance);
      await db.delete(workOrders);
      await db.delete(assetStatusUpdates);
      await db.delete(eventLog);
      await db.delete(notifications);
      
      res.json({ 
        success: true, 
        message: "All agent data has been reset",
        cleared: ["audit_logs", "agent_metrics", "approval_queue", "governance_sync_queue", "agent_alerts", "scheduled_maintenance", "work_orders", "asset_status_updates", "event_log", "notifications"]
      });
    } catch (error) {
      console.error("Reset agent data error:", error);
      res.status(500).json({ error: "Failed to reset agent data" });
    }
  });

  // Development: Create sample agent actions for testing
  app.post("/api/agent/test-actions", async (req, res) => {
    try {
      const { actionHandler } = await import("./agents/action-handler");
      
      // Create sample alert
      const alertResult = await actionHandler.createAlert("test-agent", {
        alertType: "warning",
        title: "High Severity Claim Backlog in FL Region",
        message: "Unassigned critical claims have exceeded threshold. 12 claims awaiting triage.",
        severity: "high",
        relatedAssetId: "CLM-2847",
        relatedAssetType: "claim",
        metadata: { unassignedCount: 12, region: "FL", avgAge: "4.2 days" }
      });

      // Create sample maintenance schedule
      const maintenanceResult = await actionHandler.scheduleMaintenance("test-agent", {
        title: "Adjuster Field Inspection - ADJ-003",
        description: "Scheduled quality audit of recent claim assessments",
        assetId: "ADJ-003",
        assetType: "adjuster",
        assetName: "Sarah Chen - Senior Adjuster",
        maintenanceType: "preventive",
        priority: "normal",
        scheduledStart: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        scheduledEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        estimatedCustomersAffected: 15,
        notes: "Review 10 most recent claim assessments for accuracy and compliance"
      });

      // Create sample work order
      const workOrderResult = await actionHandler.createWorkOrder("test-agent", {
        title: "Re-inspect Property at 1425 Bayshore Blvd, Tampa FL",
        description: "Initial assessment may have underestimated roof damage. Schedule re-inspection with wind/hail specialist.",
        workType: "replacement",
        priority: "high",
        assetId: "CLM-1892",
        assetType: "claim",
        assetName: "Claim CLM-1892 - Wind Damage",
        estimatedHours: 4,
        notes: "Required: wind/hail specialist adjuster, drone inspection equipment, updated satellite imagery"
      });

      // Update asset status
      const assetUpdateResult = await actionHandler.updateAssetStatus("test-agent", {
        assetId: "ADJ-005",
        assetType: "adjuster",
        assetName: "Marcus Rivera - Field Adjuster",
        previousStatus: "available",
        newStatus: "at_capacity",
        reason: "Caseload reached maximum threshold of 15 active claims",
        metadata: { activeClaims: 15, maxCapacity: 15, region: "FL-South" }
      });

      // Log event
      const eventResult = await actionHandler.logEvent("test-agent", {
        eventType: "claim_escalation",
        category: "triage",
        title: "Claim Severity Escalated",
        description: "Claim CLM-2847 escalated from moderate to critical based on updated damage assessment",
        severity: "warning",
        relatedAssetId: "CLM-2847",
        relatedAssetType: "claim",
        metadata: { previousSeverity: "moderate", newSeverity: "critical", reason: "structural_damage_confirmed" }
      });

      // Send notification
      const notificationResult = await actionHandler.sendNotification("test-agent", {
        notificationType: "alert",
        recipient: "claims-operations",
        subject: "Critical Claim Escalation: CLM-2847",
        message: "Claim CLM-2847 has been escalated to critical severity. Structural damage confirmed at property. Immediate adjuster assignment required.",
        priority: "high",
        metadata: { claimId: "CLM-2847", alertId: alertResult.data?.id }
      });

      res.json({
        success: true,
        message: "Sample agent actions created successfully",
        results: {
          alert: alertResult.success ? alertResult.data : { error: alertResult.error },
          maintenance: maintenanceResult.success ? maintenanceResult.data : { error: maintenanceResult.error },
          workOrder: workOrderResult.success ? workOrderResult.data : { error: workOrderResult.error },
          assetUpdate: assetUpdateResult.success ? assetUpdateResult.data : { error: assetUpdateResult.error },
          event: eventResult.success ? eventResult.data : { error: eventResult.error },
          notification: notificationResult.success ? notificationResult.data : { error: notificationResult.error }
        }
      });
    } catch (error) {
      console.error("Create test actions error:", error);
      res.status(500).json({ error: "Failed to create test actions" });
    }
  });

  // Start auto-sync, heartbeat, and agent registration on server startup
  import("./agents/sync-service").then(async ({ syncService }) => {
    syncService.startAutoSync();
    
    // Start system heartbeat (sends periodic pings to Averecion)
    averecionClient.startHeartbeat();

    // Register all agents with Averecion and start their individual heartbeats
    const { agentOrchestrator } = await import("./agents/orchestrator");
    await agentOrchestrator.registerAllAgents();
  }).catch(console.error);

  return httpServer;
}
