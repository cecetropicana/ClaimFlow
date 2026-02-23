/**
 * PATENT CLAIM 3: Human-in-the-Loop Approval Workflows
 * 
 * This file contains the extracted API endpoints for managing
 * human approval workflows in the multi-agent governance system.
 * 
 * Extracted from: server/routes.ts
 * Copyright (c) 2025 Cece Anderson / AverNova LLC
 */

import { Express } from "express";
import { db } from "../db";
import { approvalQueue, agentMetrics } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { autonomyTracker } from "../agents/autonomy-tracker";

export function registerApprovalRoutes(app: Express) {
  // Get pending approvals for human-in-the-loop
  app.get("/api/agent/approvals", async (req, res) => {
    try {
      const pending = await db
        .select()
        .from(approvalQueue)
        .where(eq(approvalQueue.status, "pending"))
        .orderBy(desc(approvalQueue.createdAt));
      
      res.json({ approvals: pending });
    } catch (error) {
      console.error("Approvals error:", error);
      res.status(500).json({ error: "Failed to get pending approvals" });
    }
  });

  // Approve or reject a pending action
  app.post("/api/agent/approvals/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { decision, reviewedBy, reviewNotes } = req.body;
      
      if (!decision || !["approved", "rejected"].includes(decision)) {
        return res.status(400).json({ error: "Decision must be 'approved' or 'rejected'" });
      }
      
      // Update approval status in queue
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
          await db
            .update(agentMetrics)
            .set({
              totalDecisions: existing.totalDecisions + 1,
              successfulDecisions: success 
                ? existing.successfulDecisions + 1 
                : existing.successfulDecisions,
              lastActiveAt: new Date(),
            })
            .where(eq(agentMetrics.agentId, agentId));
        }
        
        // Record outcome for autonomy progression
        await autonomyTracker.recordOutcome(agentId, success);
      } catch (metricsError) {
        console.error("[Approval] Failed to update metrics:", metricsError);
      }
      
      res.json({ approval: updated });
    } catch (error) {
      console.error("Approval update error:", error);
      res.status(500).json({ error: "Failed to update approval" });
    }
  });
}

/**
 * APPROVAL WORKFLOW PROCESS:
 * 
 * 1. Agent requests action that exceeds trust level
 * 2. BaseAgent.requestHumanApproval() adds to approvalQueue
 * 3. Human reviews in Approvals UI (approvals.tsx)
 * 4. Human approves/rejects with notes
 * 5. Decision recorded, metrics updated
 * 6. Successful approvals contribute to trust score progression
 * 7. Agent may be promoted to higher autonomy level
 */
