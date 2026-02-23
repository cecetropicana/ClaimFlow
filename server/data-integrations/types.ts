import { z } from "zod";

export type DataSourceType = 
  | "claims_database"     // Claims management database
  | "policy_system"       // Policy management system
  | "adjuster_dispatch"   // Adjuster dispatch/scheduling
  | "weather"             // Weather service API
  | "catastrophe_model"   // CAT model for loss estimation
  | "document_management" // Document/photo storage
  | "geospatial"          // GIS / property location data
  | "file_import";        // CSV, Excel, PDF imports

export interface DataSourceConfig {
  id: string;
  name: string;
  type: DataSourceType;
  enabled: boolean;
  connectionConfig: Record<string, unknown>;
  refreshIntervalMinutes?: number;
  lastSyncAt?: Date;
  status: "connected" | "disconnected" | "error" | "syncing";
}

export interface DataSourceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  source: string;
  cachedAt?: Date;
  staleAfter?: Date;
}

export const claimsDbConfigSchema = z.object({
  connectionString: z.string(),
  database: z.string(),
  schema: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export type ClaimsDbConfig = z.infer<typeof claimsDbConfigSchema>;

export const claimRecordSchema = z.object({
  claimId: z.string(),
  policyNumber: z.string(),
  policyholderName: z.string(),
  propertyAddress: z.string(),
  damageType: z.string(),
  severity: z.enum(["low", "moderate", "high", "critical", "catastrophic"]),
  status: z.string(),
  estimatedLoss: z.number(),
  assignedAdjuster: z.string().optional(),
  region: z.string(),
  filedDate: z.string(),
});

export type ClaimRecord = z.infer<typeof claimRecordSchema>;

export const adjusterRecordSchema = z.object({
  adjusterId: z.string(),
  name: z.string(),
  specialty: z.string(),
  region: z.string(),
  activeCaseload: z.number(),
  maxCaseload: z.number(),
  availability: z.enum(["available", "busy", "unavailable"]),
});

export type AdjusterRecord = z.infer<typeof adjusterRecordSchema>;

export const weatherAlertSchema = z.object({
  alertId: z.string(),
  type: z.string(),
  severity: z.string(),
  region: z.string(),
  description: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
});

export type WeatherAlert = z.infer<typeof weatherAlertSchema>;
