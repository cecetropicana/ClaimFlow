import { db } from "../db";
import { agentMetrics } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { TrustLevel } from "./types";

interface PromotionCriteria {
  minDecisions: number;
  minSuccessRate: number;
  minTrustScore: number;
  minDaysActive: number;
}

const PROMOTION_CRITERIA: Record<TrustLevel, PromotionCriteria | null> = {
  supervised: {
    minDecisions: 50,
    minSuccessRate: 0.85,
    minTrustScore: 0.7,
    minDaysActive: 7,
  },
  guided: {
    minDecisions: 200,
    minSuccessRate: 0.92,
    minTrustScore: 0.9,
    minDaysActive: 30,
  },
  semi_autonomous: null, // Maximum level
};

const DEMOTION_CRITERIA = {
  failureThreshold: 3, // Consecutive failures
  successRateThreshold: 0.5, // Below this triggers review
};

class AutonomyTracker {
  private consecutiveFailures: Map<string, number> = new Map();

  async checkPromotion(agentId: string): Promise<{
    eligible: boolean;
    currentLevel: TrustLevel;
    nextLevel: TrustLevel | null;
    progress: Record<string, { current: number; required: number; met: boolean }>;
  }> {
    const [metrics] = await db
      .select()
      .from(agentMetrics)
      .where(eq(agentMetrics.agentId, agentId));

    if (!metrics) {
      return {
        eligible: false,
        currentLevel: "supervised",
        nextLevel: "guided",
        progress: {},
      };
    }

    const currentLevel = metrics.trustLevel as TrustLevel;
    const criteria = PROMOTION_CRITERIA[currentLevel];

    if (!criteria) {
      return {
        eligible: false,
        currentLevel,
        nextLevel: null,
        progress: {},
      };
    }

    const nextLevel = this.getNextLevel(currentLevel);
    const successRate = metrics.totalDecisions > 0
      ? metrics.successfulDecisions / metrics.totalDecisions
      : 0;
    
    const daysActive = metrics.lastActiveAt
      ? Math.floor((Date.now() - new Date(metrics.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const progress = {
      decisions: {
        current: metrics.totalDecisions,
        required: criteria.minDecisions,
        met: metrics.totalDecisions >= criteria.minDecisions,
      },
      successRate: {
        current: Math.round(successRate * 100),
        required: Math.round(criteria.minSuccessRate * 100),
        met: successRate >= criteria.minSuccessRate,
      },
      trustScore: {
        current: Math.round(metrics.trustScore * 100),
        required: Math.round(criteria.minTrustScore * 100),
        met: metrics.trustScore >= criteria.minTrustScore,
      },
      daysActive: {
        current: daysActive,
        required: criteria.minDaysActive,
        met: daysActive >= criteria.minDaysActive,
      },
    };

    const eligible = Object.values(progress).every((p) => p.met);

    return {
      eligible,
      currentLevel,
      nextLevel,
      progress,
    };
  }

  async promoteAgent(agentId: string): Promise<{ success: boolean; newLevel: TrustLevel | null; error?: string }> {
    const promotionCheck = await this.checkPromotion(agentId);

    if (!promotionCheck.eligible) {
      return {
        success: false,
        newLevel: null,
        error: "Agent does not meet promotion criteria",
      };
    }

    if (!promotionCheck.nextLevel) {
      return {
        success: false,
        newLevel: null,
        error: "Agent is already at maximum autonomy level",
      };
    }

    await db
      .update(agentMetrics)
      .set({ trustLevel: promotionCheck.nextLevel })
      .where(eq(agentMetrics.agentId, agentId));

    console.log(`[AutonomyTracker] Promoted ${agentId} from ${promotionCheck.currentLevel} to ${promotionCheck.nextLevel}`);

    return {
      success: true,
      newLevel: promotionCheck.nextLevel,
    };
  }

  async recordOutcome(agentId: string, success: boolean): Promise<void> {
    const currentFailures = this.consecutiveFailures.get(agentId) || 0;

    if (success) {
      this.consecutiveFailures.set(agentId, 0);
      
      // Check for automatic promotion
      const promotionCheck = await this.checkPromotion(agentId);
      if (promotionCheck.eligible) {
        await this.promoteAgent(agentId);
      }
    } else {
      const newFailures = currentFailures + 1;
      this.consecutiveFailures.set(agentId, newFailures);

      // Check for demotion trigger
      if (newFailures >= DEMOTION_CRITERIA.failureThreshold) {
        await this.considerDemotion(agentId);
      }
    }
  }

  private async considerDemotion(agentId: string): Promise<void> {
    const [metrics] = await db
      .select()
      .from(agentMetrics)
      .where(eq(agentMetrics.agentId, agentId));

    if (!metrics) return;

    const successRate = metrics.totalDecisions > 0
      ? metrics.successfulDecisions / metrics.totalDecisions
      : 0;

    if (successRate < DEMOTION_CRITERIA.successRateThreshold) {
      const currentLevel = metrics.trustLevel as TrustLevel;
      const demotedLevel = this.getPreviousLevel(currentLevel);

      if (demotedLevel !== currentLevel) {
        await db
          .update(agentMetrics)
          .set({ trustLevel: demotedLevel })
          .where(eq(agentMetrics.agentId, agentId));

        console.log(`[AutonomyTracker] Demoted ${agentId} from ${currentLevel} to ${demotedLevel} due to poor performance`);
      }
    }

    // Reset consecutive failures after review
    this.consecutiveFailures.set(agentId, 0);
  }

  private getNextLevel(current: TrustLevel): TrustLevel | null {
    switch (current) {
      case "supervised":
        return "guided";
      case "guided":
        return "semi_autonomous";
      case "semi_autonomous":
        return null;
      default:
        return null;
    }
  }

  private getPreviousLevel(current: TrustLevel): TrustLevel {
    switch (current) {
      case "semi_autonomous":
        return "guided";
      case "guided":
        return "supervised";
      case "supervised":
        return "supervised";
      default:
        return "supervised";
    }
  }

  // Manual trust level override for testing
  async setTrustLevel(agentId: string, level: TrustLevel): Promise<{ success: boolean; error?: string }> {
    const validLevels: TrustLevel[] = ["supervised", "guided", "semi_autonomous"];
    if (!validLevels.includes(level)) {
      return { success: false, error: `Invalid trust level: ${level}` };
    }

    const [existing] = await db
      .select()
      .from(agentMetrics)
      .where(eq(agentMetrics.agentId, agentId));

    if (!existing) {
      // Create metrics record if it doesn't exist
      await db.insert(agentMetrics).values({
        agentId,
        agentType: "unknown",
        trustLevel: level,
        trustScore: 0.5,
        totalDecisions: 0,
        successfulDecisions: 0,
      });
    } else {
      await db
        .update(agentMetrics)
        .set({ trustLevel: level })
        .where(eq(agentMetrics.agentId, agentId));
    }

    console.log(`[AutonomyTracker] Manually set ${agentId} trust level to ${level}`);
    return { success: true };
  }

  async getAutonomyStatus(): Promise<Array<{
    agentId: string;
    currentLevel: TrustLevel;
    nextLevel: TrustLevel | null;
    promotionEligible: boolean;
    progress: Record<string, { current: number; required: number; met: boolean }>;
  }>> {
    const allMetrics = await db.select().from(agentMetrics);
    
    const results = await Promise.all(
      allMetrics.map(async (m) => {
        const check = await this.checkPromotion(m.agentId);
        return {
          agentId: m.agentId,
          currentLevel: check.currentLevel,
          nextLevel: check.nextLevel,
          promotionEligible: check.eligible,
          progress: check.progress,
        };
      })
    );

    return results;
  }
}

export const autonomyTracker = new AutonomyTracker();
