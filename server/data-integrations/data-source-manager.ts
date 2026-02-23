import type { DataSourceConfig, DataSourceResult, DataSourceType } from "./types";
import { ClaimsDataClient } from "./claims-client";

interface DataSourceInstance {
  config: DataSourceConfig;
  client: any;
}

class DataSourceManager {
  private sources: Map<string, DataSourceInstance> = new Map();
  private cache: Map<string, { data: unknown; expiresAt: Date }> = new Map();

  registerSource(config: DataSourceConfig): void {
    let client: any = null;

    switch (config.type) {
      case "claims_database":
        client = new ClaimsDataClient(config.connectionConfig as any);
        break;
      case "policy_system":
      case "adjuster_dispatch":
      case "weather":
      case "catastrophe_model":
      case "document_management":
      case "geospatial":
      case "file_import":
        console.log(`[DataSourceManager] ${config.type} adapter not yet implemented, using mock data`);
        break;
    }

    this.sources.set(config.id, { config, client });
    console.log(`[DataSourceManager] Registered data source: ${config.name} (${config.type})`);
  }

  getSource(id: string): DataSourceInstance | undefined {
    return this.sources.get(id);
  }

  getAllSources(): DataSourceConfig[] {
    return Array.from(this.sources.values()).map(s => s.config);
  }

  async testConnection(sourceId: string): Promise<DataSourceResult<boolean>> {
    const source = this.sources.get(sourceId);
    if (!source) {
      return { success: false, error: "Data source not found", source: sourceId };
    }

    if (!source.client) {
      return { success: false, error: "No client configured for this source type", source: sourceId };
    }

    try {
      if (source.config.type === "claims_database") {
        const result = await source.client.queryClaims({});
        return { success: result.success, data: result.success, source: sourceId };
      }
      return { success: false, error: "Connection test not implemented", source: sourceId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection test failed",
        source: sourceId,
      };
    }
  }

  getCachedData<T>(cacheKey: string): T | null {
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.data as T;
    }
    this.cache.delete(cacheKey);
    return null;
  }

  setCachedData<T>(cacheKey: string, data: T, ttlMinutes: number = 5): void {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    this.cache.set(cacheKey, { data, expiresAt });
  }

  async query<T>(
    sourceId: string,
    queryFn: (client: any) => Promise<DataSourceResult<T>>,
    cacheKey?: string,
    cacheTtlMinutes?: number
  ): Promise<DataSourceResult<T>> {
    if (cacheKey) {
      const cached = this.getCachedData<T>(cacheKey);
      if (cached !== null) {
        return { success: true, data: cached, source: sourceId, cachedAt: new Date() };
      }
    }

    const source = this.sources.get(sourceId);
    if (!source) {
      return { success: false, error: "Data source not found", source: sourceId };
    }

    if (!source.client) {
      return { success: false, error: "No client configured", source: sourceId };
    }

    const result = await queryFn(source.client);
    
    if (result.success && cacheKey && cacheTtlMinutes) {
      this.setCachedData(cacheKey, result.data, cacheTtlMinutes);
    }

    return result;
  }

  getDataSourceSchema(): Record<DataSourceType, {
    displayName: string;
    description: string;
    requiredFields: string[];
    optionalFields: string[];
    icon: string;
  }> {
    return {
      claims_database: {
        displayName: "Claims Database",
        description: "Connect to claims management database for claim records, policy data, and history",
        requiredFields: ["connectionString", "database"],
        optionalFields: ["schema", "username", "password"],
        icon: "Database",
      },
      policy_system: {
        displayName: "Policy Management System",
        description: "Policy details, coverage limits, endorsements, and premium data",
        requiredFields: ["apiEndpoint", "apiKey"],
        optionalFields: ["webhookUrl"],
        icon: "Shield",
      },
      adjuster_dispatch: {
        displayName: "Adjuster Dispatch System",
        description: "Adjuster scheduling, field assignments, and mobile inspection data",
        requiredFields: ["apiEndpoint", "apiKey"],
        optionalFields: ["dispatchRegion"],
        icon: "Users",
      },
      weather: {
        displayName: "Weather Service",
        description: "Weather forecasts, severe weather alerts, and storm tracking data",
        requiredFields: ["provider", "apiKey"],
        optionalFields: ["region"],
        icon: "Cloud",
      },
      catastrophe_model: {
        displayName: "Catastrophe Model",
        description: "CAT model outputs for loss estimation and exposure analysis",
        requiredFields: ["provider", "apiKey"],
        optionalFields: ["modelVersion", "perilType"],
        icon: "Activity",
      },
      document_management: {
        displayName: "Document Management",
        description: "Claim photos, inspection reports, and supporting documentation",
        requiredFields: ["storageEndpoint", "apiKey"],
        optionalFields: ["bucketName"],
        icon: "Upload",
      },
      geospatial: {
        displayName: "Geospatial / GIS",
        description: "Property location data, flood zones, and risk mapping",
        requiredFields: ["baseUrl", "serviceEndpoint"],
        optionalFields: ["apiKey", "layerId"],
        icon: "Map",
      },
      file_import: {
        displayName: "File Import",
        description: "Import from CSV, Excel, or PDF claim files",
        requiredFields: ["fileType"],
        optionalFields: ["columnMapping"],
        icon: "Upload",
      },
    };
  }
}

export const dataSourceManager = new DataSourceManager();

dataSourceManager.registerSource({
  id: "demo-claims-db",
  name: "Demo Claims Database",
  type: "claims_database",
  enabled: false,
  status: "disconnected",
  connectionConfig: {
    connectionString: "postgresql://claims.example.com:5432/claimflow",
    database: "claimflow_prod",
  },
});
