import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Insurance Claims Domain Enums
export const claimSeverityEnum = z.enum(["catastrophic", "major", "moderate", "minor"]);
export type ClaimSeverity = z.infer<typeof claimSeverityEnum>;

export const claimStatusEnum = z.enum(["new", "triaged", "assigned", "inspected", "estimated", "approved", "settled", "closed", "denied"]);
export type ClaimStatus = z.infer<typeof claimStatusEnum>;

export const damageTypeEnum = z.enum(["wind", "flood", "hail", "fire", "lightning", "debris", "water_damage", "structural", "other"]);
export type DamageType = z.infer<typeof damageTypeEnum>;

// Storm Event schema
export const stormEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.number(),
  status: z.enum(["active", "monitoring", "past"]),
  affectedRegions: z.array(z.string()),
  startDate: z.string(),
  endDate: z.string().optional(),
  totalClaims: z.number(),
  estimatedTotalLoss: z.number(),
});

export type StormEvent = z.infer<typeof stormEventSchema>;

// Adjuster schema
export const adjusterSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  region: z.string(),
  specialties: z.array(z.string()),
  maxCaseload: z.number(),
  currentCaseload: z.number(),
  status: z.enum(["available", "busy", "unavailable"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type Adjuster = z.infer<typeof adjusterSchema>;

// Claim schema
export const claimSchema = z.object({
  id: z.string(),
  claimNumber: z.string(),
  policyNumber: z.string(),
  policyholderName: z.string(),
  policyholderPhone: z.string(),
  policyholderEmail: z.string(),
  propertyAddress: z.string(),
  propertyCity: z.string(),
  propertyState: z.string(),
  propertyZip: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  stormEventId: z.string(),
  damageType: damageTypeEnum,
  severity: claimSeverityEnum,
  status: claimStatusEnum,
  description: z.string(),
  estimatedLoss: z.number().optional(),
  approvedAmount: z.number().optional(),
  assignedAdjusterId: z.string().optional(),
  assignedAdjusterName: z.string().optional(),
  filedDate: z.string(),
  lastUpdated: z.string(),
  inspectionDate: z.string().optional(),
  settlementDate: z.string().optional(),
  photos: z.number().default(0),
  priority: z.number(),
  notes: z.string().optional(),
});

export type Claim = z.infer<typeof claimSchema>;

// Claim Note schema
export const claimNoteSchema = z.object({
  id: z.string(),
  claimId: z.string(),
  authorName: z.string(),
  authorRole: z.string(),
  content: z.string(),
  timestamp: z.string(),
});

export type ClaimNote = z.infer<typeof claimNoteSchema>;

export const claimActivitySchema = z.object({
  id: z.string(),
  claimId: z.string(),
  previousStatus: z.string().nullable(),
  newStatus: z.string(),
  action: z.enum(["status_change", "assignment", "reassignment", "note_added", "bulk_assignment"]),
  performedBy: z.string(),
  performedByRole: z.string(),
  details: z.string().optional(),
  timestamp: z.string(),
});

export type ClaimActivity = z.infer<typeof claimActivitySchema>;

// Claims Filter schema (API requests)
export const claimsFilterSchema = z.object({
  stormEventId: z.string().optional(),
  severity: claimSeverityEnum.optional(),
  status: claimStatusEnum.optional(),
  damageType: damageTypeEnum.optional(),
  assignedAdjusterId: z.string().optional(),
  region: z.string().optional(),
  unassignedOnly: z.boolean().optional(),
  sortBy: z.enum(["priority", "filedDate", "estimatedLoss", "severity"]).optional().default("priority"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ClaimsFilter = z.infer<typeof claimsFilterSchema>;

// Bulk Assign Request schema
export const bulkAssignRequestSchema = z.object({
  claimIds: z.array(z.string()),
  adjusterId: z.string(),
});

export type BulkAssignRequest = z.infer<typeof bulkAssignRequestSchema>;

// Dashboard Metrics schema
export const dashboardMetricsSchema = z.object({
  totalClaims: z.number(),
  openClaims: z.number(),
  unassignedClaims: z.number(),
  avgClaimAgeDays: z.number(),
  totalEstimatedLoss: z.number(),
  totalApprovedAmount: z.number(),
  claimsByStorm: z.array(z.object({
    stormEventId: z.string(),
    stormName: z.string(),
    count: z.number(),
    totalLoss: z.number(),
  })),
  claimsBySeverity: z.object({
    catastrophic: z.number(),
    major: z.number(),
    moderate: z.number(),
    minor: z.number(),
  }),
  claimsByStatus: z.record(claimStatusEnum, z.number()),
  claimsByDamageType: z.record(damageTypeEnum, z.number()),
});

export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;

// Chat Message schema
export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string(),
  cardType: z.enum(["text", "claims-summary", "claim-detail", "backlog-stats", "adjuster-workload", "storm-claims"]).optional(),
  cardData: z.any().optional(),
  isMockData: z.boolean().optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Chat conversations table
export const conversations = pgTable("conversations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({ title: true });

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

// Chat messages table
export const messages = pgTable("messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).pick({ conversationId: true, role: true, content: true });

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Audit logs table for agent governance
export const auditLogs = pgTable("audit_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  correlationId: text("correlation_id").notNull(),
  agentId: text("agent_id").notNull(),
  action: text("action").notNull(),
  input: text("input"),
  output: text("output"),
  decision: text("decision").notNull(),
  confidenceScore: real("confidence_score"),
  latencyMs: integer("latency_ms"),
  tokenUsage: integer("token_usage"),
  costUsd: real("cost_usd"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).pick({ correlationId: true, agentId: true, action: true, input: true, output: true, decision: true, confidenceScore: true, latencyMs: true, tokenUsage: true, costUsd: true });

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Agent metrics table for trust tracking
export const agentMetrics = pgTable("agent_metrics", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: text("agent_id").notNull().unique(),
  agentType: text("agent_type").notNull(),
  trustLevel: text("trust_level").notNull().default("supervised"),
  trustScore: real("trust_score").notNull().default(0),
  totalDecisions: integer("total_decisions").notNull().default(0),
  successfulDecisions: integer("successful_decisions").notNull().default(0),
  lastActiveAt: timestamp("last_active_at").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAgentMetricSchema = createInsertSchema(agentMetrics).pick({ agentId: true, agentType: true, trustLevel: true, trustScore: true, totalDecisions: true, successfulDecisions: true, lastActiveAt: true });

export type AgentMetric = typeof agentMetrics.$inferSelect;
export type InsertAgentMetric = z.infer<typeof insertAgentMetricSchema>;

// Approval queue table for human-in-the-loop
export const approvalQueue = pgTable("approval_queue", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  correlationId: text("correlation_id").notNull(),
  agentId: text("agent_id").notNull(),
  action: text("action").notNull(),
  context: text("context"),
  status: text("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertApprovalSchema = createInsertSchema(approvalQueue).pick({ correlationId: true, agentId: true, action: true, context: true, status: true, reviewedBy: true, reviewNotes: true });

export type ApprovalItem = typeof approvalQueue.$inferSelect;
export type InsertApprovalItem = z.infer<typeof insertApprovalSchema>;

// Governance sync queue for offline decisions
export const governanceSyncQueue = pgTable("governance_sync_queue", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  correlationId: text("correlation_id").notNull(),
  agentId: text("agent_id").notNull(),
  action: text("action").notNull(),
  payload: text("payload"),
  decision: text("decision").notNull(),
  success: boolean("success"),
  syncStatus: text("sync_status").notNull().default("pending"),
  retryCount: integer("retry_count").notNull().default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  syncedAt: timestamp("synced_at"),
});

export const insertSyncItemSchema = createInsertSchema(governanceSyncQueue).pick({ 
  correlationId: true, 
  agentId: true, 
  action: true, 
  payload: true, 
  decision: true,
  success: true,
  syncStatus: true 
});

export type SyncItem = typeof governanceSyncQueue.$inferSelect;
export type InsertSyncItem = z.infer<typeof insertSyncItemSchema>;

// Agent Actions - Alerts table
export const agentAlerts = pgTable("agent_alerts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: text("agent_id").notNull(),
  alertType: text("alert_type").notNull(), // warning, critical, info, success
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: text("severity").notNull().default("medium"), // low, medium, high, critical
  status: text("status").notNull().default("active"), // active, acknowledged, resolved
  relatedAssetId: text("related_asset_id"),
  relatedAssetType: text("related_asset_type"),
  metadata: text("metadata"), // JSON string
  acknowledgedBy: text("acknowledged_by"),
  resolvedBy: text("resolved_by"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
});

export const insertAgentAlertSchema = createInsertSchema(agentAlerts).pick({
  agentId: true, alertType: true, title: true, message: true, severity: true,
  status: true, relatedAssetId: true, relatedAssetType: true, metadata: true
});

export type AgentAlert = typeof agentAlerts.$inferSelect;
export type InsertAgentAlert = z.infer<typeof insertAgentAlertSchema>;

// Agent Actions - Scheduled Maintenance table
export const scheduledMaintenance = pgTable("scheduled_maintenance", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: text("agent_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assetId: text("asset_id").notNull(),
  assetType: text("asset_type").notNull(), // claim, adjuster, property
  assetName: text("asset_name"),
  maintenanceType: text("maintenance_type").notNull(), // preventive, corrective, emergency
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, cancelled
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end").notNull(),
  estimatedCustomersAffected: integer("estimated_customers_affected"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertMaintenanceSchema = createInsertSchema(scheduledMaintenance).pick({
  agentId: true, title: true, description: true, assetId: true, assetType: true,
  assetName: true, maintenanceType: true, priority: true, status: true,
  scheduledStart: true, scheduledEnd: true, estimatedCustomersAffected: true, notes: true
});

export type ScheduledMaintenance = typeof scheduledMaintenance.$inferSelect;
export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;

// Agent Actions - Work Orders table
export const workOrders = pgTable("work_orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: text("agent_id").notNull(),
  workOrderNumber: text("work_order_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  workType: text("work_type").notNull(), // inspection, repair, upgrade, installation
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  status: text("status").notNull().default("open"), // open, assigned, in_progress, completed, cancelled
  assetId: text("asset_id"),
  assetType: text("asset_type"),
  assetName: text("asset_name"),
  assignedTo: text("assigned_to"),
  assignedTeam: text("assigned_team"),
  estimatedHours: real("estimated_hours"),
  actualHours: real("actual_hours"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertWorkOrderSchema = createInsertSchema(workOrders).pick({
  agentId: true, workOrderNumber: true, title: true, description: true,
  workType: true, priority: true, status: true, assetId: true, assetType: true,
  assetName: true, assignedTo: true, assignedTeam: true, estimatedHours: true, dueDate: true, notes: true
});

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;

// Agent Actions - Asset Status Updates table
export const assetStatusUpdates = pgTable("asset_status_updates", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: text("agent_id").notNull(),
  assetId: text("asset_id").notNull(),
  assetType: text("asset_type").notNull(),
  assetName: text("asset_name"),
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  reason: text("reason"),
  needsInspection: boolean("needs_inspection").default(false),
  inspectionPriority: text("inspection_priority"), // low, normal, high, urgent
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAssetStatusSchema = createInsertSchema(assetStatusUpdates).pick({
  agentId: true, assetId: true, assetType: true, assetName: true,
  previousStatus: true, newStatus: true, reason: true, needsInspection: true, inspectionPriority: true, metadata: true
});

export type AssetStatusUpdate = typeof assetStatusUpdates.$inferSelect;
export type InsertAssetStatus = z.infer<typeof insertAssetStatusSchema>;

// Agent Actions - Event Log table
export const eventLog = pgTable("event_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: text("agent_id").notNull(),
  eventType: text("event_type").notNull(), // incident, observation, decision, action, alert
  category: text("category").notNull(), // storm, capacity, load, topology, maintenance
  title: text("title").notNull(),
  description: text("description"),
  severity: text("severity").notNull().default("info"), // info, warning, error, critical
  relatedAssetId: text("related_asset_id"),
  relatedAssetType: text("related_asset_type"),
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertEventLogSchema = createInsertSchema(eventLog).pick({
  agentId: true, eventType: true, category: true, title: true, description: true,
  severity: true, relatedAssetId: true, relatedAssetType: true, metadata: true
});

export type EventLogEntry = typeof eventLog.$inferSelect;
export type InsertEventLog = z.infer<typeof insertEventLogSchema>;

// Agent Actions - Notifications table (for tracking sent notifications)
export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  agentId: text("agent_id").notNull(),
  notificationType: text("notification_type").notNull(), // email, sms, push, in_app
  recipient: text("recipient").notNull(),
  subject: text("subject"),
  message: text("message").notNull(),
  priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
  status: text("status").notNull().default("pending"), // pending, sent, delivered, failed
  relatedEventId: integer("related_event_id"),
  metadata: text("metadata"), // JSON string
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  agentId: true, notificationType: true, recipient: true, subject: true,
  message: true, priority: true, status: true, relatedEventId: true, metadata: true
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
