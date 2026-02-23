import crypto from "crypto";

interface CacheEntry<T> {
  data: T;
  createdAt: number;
  ttl: number;
  hits: number;
  agentId: string;
  action: string;
}

interface CacheConfig {
  defaultTTL: number;
  maxEntries: number;
  cleanupInterval: number;
}

class AgentCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes default
      maxEntries: config.maxEntries || 1000,
      cleanupInterval: config.cleanupInterval || 60 * 1000, // 1 minute cleanup
    };

    this.startCleanup();
  }

  private generateKey(agentId: string, action: string, payload: unknown): string {
    const hash = crypto.createHash("sha256");
    hash.update(JSON.stringify({ agentId, action, payload }));
    return hash.digest("hex");
  }

  get<T>(agentId: string, action: string, payload: unknown): T | null {
    const key = this.generateKey(agentId, action, payload);
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.createdAt > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  set<T>(
    agentId: string,
    action: string,
    payload: unknown,
    data: T,
    ttl?: number
  ): void {
    const key = this.generateKey(agentId, action, payload);

    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      createdAt: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      hits: 0,
      agentId,
      action,
    });
  }

  invalidate(agentId: string, action?: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (entry.agentId === agentId) {
        if (!action || entry.action === action) {
          keysToDelete.push(key);
        }
      }
    });
    
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): {
    size: number;
    maxEntries: number;
    hitRate: number;
  } {
    let totalHits = 0;
    this.cache.forEach((entry) => {
      totalHits += entry.hits;
    });

    return {
      size: this.cache.size,
      maxEntries: this.config.maxEntries,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
    };
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      this.cache.forEach((entry, key) => {
        if (now - entry.createdAt > entry.ttl) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach((key) => this.cache.delete(key));
    }, this.config.cleanupInterval);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }
}

// Cache TTL configurations by action type (matching ActionType enum values)
export const CACHE_TTL: Record<string, number> = {
  triage_claim: 10 * 60 * 1000,              // 10 minutes - claim data changes
  analyze_backlog: 15 * 60 * 1000,           // 15 minutes - backlog metrics shift
  manage_adjusters: 30 * 60 * 1000,          // 30 minutes - adjuster assignments
  assess_storm: 10 * 60 * 1000,             // 10 minutes - storm data changes
  query_response: 5 * 60 * 1000,             // 5 minutes - general queries
};

export const agentCache = new AgentCache({
  defaultTTL: 5 * 60 * 1000,
  maxEntries: 500,
  cleanupInterval: 60 * 1000,
});
