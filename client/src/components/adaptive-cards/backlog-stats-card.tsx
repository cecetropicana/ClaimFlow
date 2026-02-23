import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ListTodo,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import type { DashboardMetrics } from "@shared/schema";
import { MockDataBanner } from "@/components/mock-data-banner";

interface BacklogStatsCardProps {
  data: DashboardMetrics;
  isMockData?: boolean;
}

const statusOrder = ["new", "triaged", "assigned", "inspected", "estimated", "approved", "settled", "closed", "denied"] as const;

export function BacklogStatsCard({ data, isMockData = false }: BacklogStatsCardProps) {
  const urgentUnassigned = data.claimsBySeverity.catastrophic + data.claimsBySeverity.major;
  const unassignedPct = data.totalClaims > 0 ? (data.unassignedClaims / data.totalClaims) * 100 : 0;

  return (
    <Card className="w-full max-w-3xl border-card-border" data-testid="card-backlog-stats">
      {isMockData && (
        <div className="px-6 pt-4">
          <MockDataBanner />
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <ListTodo className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Backlog Overview</h3>
            <p className="text-sm text-muted-foreground">
              Claims pipeline and unassigned queue
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="font-semibold text-sm">Urgency</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Unassigned Claims</p>
              <p className="text-2xl font-bold" data-testid="text-unassigned-count">
                {data.unassignedClaims}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Critical Unassigned</p>
              <p className="text-2xl font-bold text-destructive" data-testid="text-urgent-unassigned">
                {urgentUnassigned}
              </p>
              <p className="text-xs text-muted-foreground">catastrophic + major</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Backlog Ratio</p>
              <p className="text-2xl font-bold" data-testid="text-backlog-ratio">
                {unassignedPct.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold">Unassigned Ratio</span>
          <Progress value={unassignedPct} className="h-3" />
          <p className="text-xs text-muted-foreground">
            {data.unassignedClaims} of {data.totalClaims} total claims
          </p>
        </div>

        <div className="space-y-3">
          <span className="text-sm font-semibold">Claims by Status</span>
          <div className="space-y-2">
            {statusOrder.map((status) => {
              const count = data.claimsByStatus?.[status] ?? 0;
              if (count === 0) return null;
              const pct = data.totalClaims > 0 ? (count / data.totalClaims) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs capitalize w-24 justify-center">
                    {status}
                  </Badge>
                  <div className="flex-1">
                    <Progress value={pct} className="h-2" />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2">
          <Link href="/backlog">
            <Button variant="default" size="sm" data-testid="button-open-backlog">
              <ArrowRight className="h-4 w-4 mr-2" />
              Open Backlog Queue
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
