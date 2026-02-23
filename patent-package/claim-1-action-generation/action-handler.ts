import { db } from "../db";
import {
  agentAlerts,
  scheduledMaintenance,
  workOrders,
  assetStatusUpdates,
  eventLog,
  notifications,
  AgentAlert,
  ScheduledMaintenance,
  WorkOrder,
  AssetStatusUpdate,
  EventLogEntry,
  Notification,
} from "@shared/schema";
import { desc, eq } from "drizzle-orm";

function parseJsonField<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function parseAlertMetadata(alert: AgentAlert): AgentAlert & { parsedMetadata?: Record<string, unknown> } {
  return {
    ...alert,
    parsedMetadata: parseJsonField<Record<string, unknown>>(alert.metadata),
  };
}

function parseAssetMetadata(update: AssetStatusUpdate): AssetStatusUpdate & { parsedMetadata?: Record<string, unknown> } {
  return {
    ...update,
    parsedMetadata: parseJsonField<Record<string, unknown>>(update.metadata),
  };
}

function parseEventMetadata(event: EventLogEntry): EventLogEntry & { parsedMetadata?: Record<string, unknown> } {
  return {
    ...event,
    parsedMetadata: parseJsonField<Record<string, unknown>>(event.metadata),
  };
}

function parseNotificationMetadata(notification: Notification): Notification & { parsedMetadata?: Record<string, unknown> } {
  return {
    ...notification,
    parsedMetadata: parseJsonField<Record<string, unknown>>(notification.metadata),
  };
}

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function generateWorkOrderNumber(): string {
  const prefix = "WO";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export class ActionHandler {
  async createAlert(
    agentId: string,
    params: {
      alertType: string;
      title: string;
      message: string;
      severity?: string;
      relatedAssetId?: string;
      relatedAssetType?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ActionResult<AgentAlert>> {
    try {
      const [alert] = await db
        .insert(agentAlerts)
        .values({
          agentId,
          alertType: params.alertType,
          title: params.title,
          message: params.message,
          severity: params.severity || "medium",
          status: "active",
          relatedAssetId: params.relatedAssetId,
          relatedAssetType: params.relatedAssetType,
          metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
        })
        .returning();

      console.log(`[ActionHandler] Created alert: ${alert.title} (ID: ${alert.id})`);
      return { success: true, data: alert };
    } catch (error) {
      console.error("[ActionHandler] Failed to create alert:", error);
      return { success: false, error: String(error) };
    }
  }

  async scheduleMaintenance(
    agentId: string,
    params: {
      title: string;
      description?: string;
      assetId: string;
      assetType: string;
      assetName?: string;
      maintenanceType: string;
      priority?: string;
      scheduledStart: Date;
      scheduledEnd: Date;
      estimatedCustomersAffected?: number;
      notes?: string;
    }
  ): Promise<ActionResult<ScheduledMaintenance>> {
    try {
      const [maintenance] = await db
        .insert(scheduledMaintenance)
        .values({
          agentId,
          title: params.title,
          description: params.description,
          assetId: params.assetId,
          assetType: params.assetType,
          assetName: params.assetName,
          maintenanceType: params.maintenanceType,
          priority: params.priority || "normal",
          status: "scheduled",
          scheduledStart: params.scheduledStart,
          scheduledEnd: params.scheduledEnd,
          estimatedCustomersAffected: params.estimatedCustomersAffected,
          notes: params.notes,
        })
        .returning();

      console.log(`[ActionHandler] Scheduled maintenance: ${maintenance.title} (ID: ${maintenance.id})`);
      return { success: true, data: maintenance };
    } catch (error) {
      console.error("[ActionHandler] Failed to schedule maintenance:", error);
      return { success: false, error: String(error) };
    }
  }

  async createWorkOrder(
    agentId: string,
    params: {
      title: string;
      description?: string;
      workType: string;
      priority?: string;
      assetId?: string;
      assetType?: string;
      assetName?: string;
      assignedTo?: string;
      assignedTeam?: string;
      estimatedHours?: number;
      dueDate?: Date;
      notes?: string;
    }
  ): Promise<ActionResult<WorkOrder>> {
    try {
      const workOrderNumber = generateWorkOrderNumber();
      const [workOrder] = await db
        .insert(workOrders)
        .values({
          agentId,
          workOrderNumber,
          title: params.title,
          description: params.description,
          workType: params.workType,
          priority: params.priority || "normal",
          status: "open",
          assetId: params.assetId,
          assetType: params.assetType,
          assetName: params.assetName,
          assignedTo: params.assignedTo,
          assignedTeam: params.assignedTeam,
          estimatedHours: params.estimatedHours,
          dueDate: params.dueDate,
          notes: params.notes,
        })
        .returning();

      console.log(`[ActionHandler] Created work order: ${workOrder.workOrderNumber} - ${workOrder.title} (ID: ${workOrder.id})`);
      return { success: true, data: workOrder };
    } catch (error) {
      console.error("[ActionHandler] Failed to create work order:", error);
      return { success: false, error: String(error) };
    }
  }

  async updateAssetStatus(
    agentId: string,
    params: {
      assetId: string;
      assetType: string;
      assetName?: string;
      previousStatus?: string;
      newStatus: string;
      reason?: string;
      needsInspection?: boolean;
      inspectionPriority?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ActionResult<AssetStatusUpdate>> {
    try {
      const [statusUpdate] = await db
        .insert(assetStatusUpdates)
        .values({
          agentId,
          assetId: params.assetId,
          assetType: params.assetType,
          assetName: params.assetName,
          previousStatus: params.previousStatus,
          newStatus: params.newStatus,
          reason: params.reason,
          needsInspection: params.needsInspection || false,
          inspectionPriority: params.inspectionPriority,
          metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
        })
        .returning();

      console.log(`[ActionHandler] Updated asset status: ${params.assetId} -> ${params.newStatus} (ID: ${statusUpdate.id})`);
      return { success: true, data: statusUpdate };
    } catch (error) {
      console.error("[ActionHandler] Failed to update asset status:", error);
      return { success: false, error: String(error) };
    }
  }

  async logEvent(
    agentId: string,
    params: {
      eventType: string;
      category: string;
      title: string;
      description?: string;
      severity?: string;
      relatedAssetId?: string;
      relatedAssetType?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ActionResult<EventLogEntry>> {
    try {
      const [event] = await db
        .insert(eventLog)
        .values({
          agentId,
          eventType: params.eventType,
          category: params.category,
          title: params.title,
          description: params.description,
          severity: params.severity || "info",
          relatedAssetId: params.relatedAssetId,
          relatedAssetType: params.relatedAssetType,
          metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
        })
        .returning();

      console.log(`[ActionHandler] Logged event: ${event.title} (ID: ${event.id})`);
      return { success: true, data: event };
    } catch (error) {
      console.error("[ActionHandler] Failed to log event:", error);
      return { success: false, error: String(error) };
    }
  }

  async sendNotification(
    agentId: string,
    params: {
      notificationType: string;
      recipient: string;
      subject?: string;
      message: string;
      priority?: string;
      relatedEventId?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ActionResult<Notification>> {
    try {
      const [notification] = await db
        .insert(notifications)
        .values({
          agentId,
          notificationType: params.notificationType,
          recipient: params.recipient,
          subject: params.subject,
          message: params.message,
          priority: params.priority || "normal",
          status: "sent",
          relatedEventId: params.relatedEventId,
          metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
        })
        .returning();

      console.log(`[ActionHandler] Sent notification to ${notification.recipient}: ${notification.subject || notification.message.substring(0, 50)}`);
      return { success: true, data: notification };
    } catch (error) {
      console.error("[ActionHandler] Failed to send notification:", error);
      return { success: false, error: String(error) };
    }
  }

  async getRecentAlerts(limit: number = 50) {
    const results = await db.select().from(agentAlerts).orderBy(desc(agentAlerts.createdAt)).limit(limit);
    return results.map(parseAlertMetadata);
  }

  async getScheduledMaintenance(limit: number = 50): Promise<ScheduledMaintenance[]> {
    return db.select().from(scheduledMaintenance).orderBy(desc(scheduledMaintenance.createdAt)).limit(limit);
  }

  async getWorkOrders(limit: number = 50): Promise<WorkOrder[]> {
    return db.select().from(workOrders).orderBy(desc(workOrders.createdAt)).limit(limit);
  }

  async getAssetStatusUpdates(limit: number = 50) {
    const results = await db.select().from(assetStatusUpdates).orderBy(desc(assetStatusUpdates.createdAt)).limit(limit);
    return results.map(parseAssetMetadata);
  }

  async getEventLog(limit: number = 100) {
    const results = await db.select().from(eventLog).orderBy(desc(eventLog.createdAt)).limit(limit);
    return results.map(parseEventMetadata);
  }

  async getNotifications(limit: number = 50) {
    const results = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(limit);
    return results.map(parseNotificationMetadata);
  }

  async acknowledgeAlert(alertId: number, acknowledgedBy: string): Promise<ActionResult<AgentAlert>> {
    try {
      const [alert] = await db
        .update(agentAlerts)
        .set({
          status: "acknowledged",
          acknowledgedBy,
          acknowledgedAt: new Date(),
        })
        .where(eq(agentAlerts.id, alertId))
        .returning();

      return { success: true, data: alert };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async resolveAlert(alertId: number, resolvedBy: string): Promise<ActionResult<AgentAlert>> {
    try {
      const [alert] = await db
        .update(agentAlerts)
        .set({
          status: "resolved",
          resolvedBy,
          resolvedAt: new Date(),
        })
        .where(eq(agentAlerts.id, alertId))
        .returning();

      return { success: true, data: alert };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async updateWorkOrderStatus(
    workOrderId: number,
    status: string,
    actualHours?: number
  ): Promise<ActionResult<WorkOrder>> {
    try {
      const updates: Partial<WorkOrder> = {
        status,
        updatedAt: new Date(),
      };
      if (actualHours !== undefined) {
        updates.actualHours = actualHours;
      }
      if (status === "completed") {
        updates.completedAt = new Date();
      }

      const [workOrder] = await db
        .update(workOrders)
        .set(updates)
        .where(eq(workOrders.id, workOrderId))
        .returning();

      return { success: true, data: workOrder };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async updateMaintenanceStatus(
    maintenanceId: number,
    status: string
  ): Promise<ActionResult<ScheduledMaintenance>> {
    try {
      const [maintenance] = await db
        .update(scheduledMaintenance)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(scheduledMaintenance.id, maintenanceId))
        .returning();

      return { success: true, data: maintenance };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

export const actionHandler = new ActionHandler();
