import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  UserX,
  Clock,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import type { DashboardMetrics } from "@shared/schema";
import { MockDataBanner } from "@/components/mock-data-banner";

interface ClaimsSummaryCardProps {
  data: DashboardMetrics;
  isMockData?: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

const severityColors: Record<string, string> = {
  catastrophic: "text-red-600 dark:text-red-400",
  major: "text-orange-600 dark:text-orange-400",
  moderate: "text-amber-600 dark:text-amber-400",
  minor: "text-green-600 dark:text-green-400",
};

const severityBg: Record<string, string> = {
  catastrophic: "bg-red-100 dark:bg-red-900/30",
  major: "bg-orange-100 dark:bg-orange-900/30",
  moderate: "bg-amber-100 dark:bg-amber-900/30",
  minor: "bg-green-100 dark:bg-green-900/30",
};

export function ClaimsSummaryCard({ data, isMockData = false }: ClaimsSummaryCardProps) {
  return (
    <Card className="w-full max-w-3xl border-card-border" data-testid="card-claims-summary">
      {isMockData && (
        <div className="px-6 pt-4">
          <MockDataBanner />
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Claims Summary</h3>
            <p className="text-sm text-muted-foreground">
              Overview of current claims pipeline
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>Open Claims</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-open-claims">
              {data.openClaims}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserX className="h-3.5 w-3.5" />
              <span>Unassigned</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-unassigned-claims">
              {data.unassignedClaims}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Avg Age (days)</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-avg-age">
              {data.avgClaimAgeDays.toFixed(1)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Est. Total Loss</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-loss">
              {formatCurrency(data.totalEstimatedLoss)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Claims by Severity</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.entries(data.claimsBySeverity) as [string, number][]).map(([severity, count]) => (
              <div
                key={severity}
                className={`p-3 rounded-lg ${severityBg[severity] ?? "bg-muted"}`}
                data-testid={`severity-${severity}`}
              >
                <p className="text-xs font-medium capitalize text-muted-foreground">{severity}</p>
                <p className={`text-xl font-bold ${severityColors[severity] ?? ""}`}>{count}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
