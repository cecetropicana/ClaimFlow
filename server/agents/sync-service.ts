import { db } from "../db";
import { governanceSyncQueue, type InsertSyncItem } from "@shared/schema";
import { eq, and, lt, count } from "drizzle-orm";
import { averecionClient } from "./averecion-client";

const MAX_RETRIES = 3;
const SYNC_BATCH_SIZE = 50;
const BASE_RETRY_DELAY_MS = 1000;
const SYNC_INTERVAL_MS = 60000; // 1 minute

interface SyncStatus {
  pendingCount: number;
  failedCount: number;
  syncedCount: number;
  lastSyncAttempt: Date | null;
  lastSuccessfulSync: Date | null;
  isRunning: boolean;
}

class GovernanceSyncService {
  private isRunning = false;
  private lastSyncAttempt: Date | null = null;
  private lastSuccessfulSync: Date | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  async queueForSync(item: InsertSyncItem): Promise<void> {
    try {
      await db.insert(governanceSyncQueue).values({
        ...item,
        syncStatus: "pending",
        retryCount: 0,
      });
      console.log(`Queued decision ${item.correlationId} for sync`);
    } catch (error) {
      console.error("Failed to queue sync item:", error);
    }
  }

  async syncPending(): Promise<{ synced: number; failed: number }> {
    if (this.isRunning) {
      return { synced: 0, failed: 0 };
    }

    this.isRunning = true;
    this.lastSyncAttempt = new Date();
    let synced = 0;
    let failed = 0;

    try {
      const connectionStatus = await averecionClient.checkConnection();
      if (!connectionStatus.connected) {
        console.log("Averecion offline, skipping sync");
        return { synced: 0, failed: 0 };
      }

      const pendingItems = await db
        .select()
        .from(governanceSyncQueue)
        .where(
          and(
            eq(governanceSyncQueue.syncStatus, "pending"),
            lt(governanceSyncQueue.retryCount, MAX_RETRIES)
          )
        )
        .limit(SYNC_BATCH_SIZE);

      if (pendingItems.length === 0) {
        return { synced: 0, failed: 0 };
      }

      console.log(`Syncing ${pendingItems.length} pending decisions to Averecion...`);

      for (const item of pendingItems) {
        try {
          await averecionClient.reportOutcome(
            item.agentId,
            item.action as any,
            item.success ?? true
          );

          await db
            .update(governanceSyncQueue)
            .set({
              syncStatus: "synced",
              syncedAt: new Date(),
            })
            .where(eq(governanceSyncQueue.id, item.id));

          synced++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          const newRetryCount = item.retryCount + 1;
          
          await db
            .update(governanceSyncQueue)
            .set({
              retryCount: newRetryCount,
              lastError: errorMessage,
              syncStatus: newRetryCount >= MAX_RETRIES ? "failed" : "pending",
            })
            .where(eq(governanceSyncQueue.id, item.id));

          failed++;
          console.error(`Failed to sync ${item.correlationId}:`, errorMessage);

          // Exponential backoff with jitter between items on failure
          const backoffMs = BASE_RETRY_DELAY_MS * Math.pow(2, item.retryCount) + Math.random() * 500;
          await new Promise(resolve => setTimeout(resolve, Math.min(backoffMs, 10000)));
        }
      }

      if (synced > 0) {
        this.lastSuccessfulSync = new Date();
        console.log(`Successfully synced ${synced} decisions to Averecion`);
      }

      return { synced, failed };
    } finally {
      this.isRunning = false;
    }
  }

  async getStatus(): Promise<SyncStatus> {
    const [pending] = await db
      .select({ count: governanceSyncQueue.id })
      .from(governanceSyncQueue)
      .where(eq(governanceSyncQueue.syncStatus, "pending"));

    const [failed] = await db
      .select({ count: governanceSyncQueue.id })
      .from(governanceSyncQueue)
      .where(eq(governanceSyncQueue.syncStatus, "failed"));

    const [synced] = await db
      .select({ count: governanceSyncQueue.id })
      .from(governanceSyncQueue)
      .where(eq(governanceSyncQueue.syncStatus, "synced"));

    return {
      pendingCount: pending?.count ? 1 : 0,
      failedCount: failed?.count ? 1 : 0,
      syncedCount: synced?.count ? 1 : 0,
      lastSyncAttempt: this.lastSyncAttempt,
      lastSuccessfulSync: this.lastSuccessfulSync,
      isRunning: this.isRunning,
    };
  }

  async getDetailedStatus(): Promise<{
    pending: number;
    failed: number;
    synced: number;
    lastSyncAttempt: string | null;
    lastSuccessfulSync: string | null;
    isRunning: boolean;
    recentItems: Array<{
      id: number;
      correlationId: string;
      agentId: string;
      action: string;
      syncStatus: string;
      retryCount: number;
      createdAt: Date;
    }>;
  }> {
    const { desc } = await import("drizzle-orm");
    
    const [pendingResult] = await db
      .select({ count: count() })
      .from(governanceSyncQueue)
      .where(eq(governanceSyncQueue.syncStatus, "pending"));

    const [failedResult] = await db
      .select({ count: count() })
      .from(governanceSyncQueue)
      .where(eq(governanceSyncQueue.syncStatus, "failed"));

    const [syncedResult] = await db
      .select({ count: count() })
      .from(governanceSyncQueue)
      .where(eq(governanceSyncQueue.syncStatus, "synced"));

    const recentItems = await db
      .select({
        id: governanceSyncQueue.id,
        correlationId: governanceSyncQueue.correlationId,
        agentId: governanceSyncQueue.agentId,
        action: governanceSyncQueue.action,
        syncStatus: governanceSyncQueue.syncStatus,
        retryCount: governanceSyncQueue.retryCount,
        createdAt: governanceSyncQueue.createdAt,
      })
      .from(governanceSyncQueue)
      .orderBy(desc(governanceSyncQueue.createdAt))
      .limit(10);

    return {
      pending: Number(pendingResult?.count ?? 0),
      failed: Number(failedResult?.count ?? 0),
      synced: Number(syncedResult?.count ?? 0),
      lastSyncAttempt: this.lastSyncAttempt?.toISOString() ?? null,
      lastSuccessfulSync: this.lastSuccessfulSync?.toISOString() ?? null,
      isRunning: this.isRunning,
      recentItems,
    };
  }

  startAutoSync(): void {
    if (this.intervalId) {
      return;
    }

    console.log(`Starting governance auto-sync (interval: ${SYNC_INTERVAL_MS}ms)`);
    this.intervalId = setInterval(async () => {
      try {
        await this.syncPending();
      } catch (error) {
        console.error("Auto-sync error:", error);
      }
    }, SYNC_INTERVAL_MS);

    this.syncPending().catch(console.error);
  }

  stopAutoSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Governance auto-sync stopped");
    }
  }

  async retryFailed(): Promise<{ reset: number }> {
    const result = await db
      .update(governanceSyncQueue)
      .set({
        syncStatus: "pending",
        retryCount: 0,
        lastError: null,
      })
      .where(eq(governanceSyncQueue.syncStatus, "failed"))
      .returning();

    return { reset: result.length };
  }
}

export const syncService = new GovernanceSyncService();
