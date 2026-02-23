import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  CloudLightning,
  DollarSign,
  Clock,
  AlertTriangle,
  Users,
  FileText,
  ArrowRight,
  Flame,
  Droplets,
  Zap,
  Wind,
  Filter,
  X,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Bot,
} from "lucide-react";
import type { DashboardMetrics, StormEvent, Claim, ApprovalItem } from "@shared/schema";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

const stormStatusVariant = (status: string) => {
  switch (status) {
    case "active":
      return "destructive" as const;
    case "monitoring":
      return "default" as const;
    case "past":
      return "secondary" as const;
    default:
      return "secondary" as const;
  }
};

const severityConfig: Record<string, { label: string; color: string }> = {
  catastrophic: { label: "Catastrophic", color: "bg-destructive" },
  major: { label: "Major", color: "bg-chart-4" },
  moderate: { label: "Moderate", color: "bg-chart-3" },
  minor: { label: "Minor", color: "bg-chart-2" },
};

const damageTypeLabels: Record<string, string> = {
  wind: "Wind",
  flood: "Flood",
  hail: "Hail",
  fire: "Fire",
  lightning: "Lightning",
  debris: "Debris",
  water_damage: "Water Damage",
  structural: "Structural",
  other: "Other",
};

const damageTypeIcons: Record<string, typeof Wind> = {
  wind: Wind,
  flood: Droplets,
  hail: CloudLightning,
  fire: Flame,
  lightning: Zap,
  debris: AlertTriangle,
  water_damage: Droplets,
  structural: FileText,
  other: FileText,
};

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StormsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24 mt-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SeveritySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-6 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const ALL = "__all__";
const regionOptions = ["FL", "GA", "SC", "LA", "TX", "NC"] as const;
const severityFilterOptions = ["catastrophic", "major", "moderate", "minor"] as const;
const claimStatusOptions = ["new", "triaged", "assigned", "inspected", "estimated", "approved", "settled", "closed", "denied"] as const;

const statusLabels: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  assigned: "Assigned",
  inspected: "Inspected",
  estimated: "Estimated",
  approved: "Approved",
  settled: "Settled",
  closed: "Closed",
  denied: "Denied",
};

const approvalStatusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  approved: { label: "Approved", icon: CheckCircle2, className: "text-green-600 dark:text-green-400" },
  rejected: { label: "Rejected", icon: XCircle, className: "text-destructive" },
  pending: { label: "Pending", icon: Clock, className: "text-yellow-600 dark:text-yellow-400" },
};

const agentNameMap: Record<string, string> = {
  "claims-triage": "Claims Triage Agent",
  "backlog-analysis": "Backlog Analysis Agent",
  "adjuster-management": "Adjuster Management Agent",
  "storm-assessment": "Storm Assessment Agent",
};

function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function DashboardPage() {
  const [stormFilter, setStormFilter] = useState<string | undefined>();
  const [regionFilter, setRegionFilter] = useState<string | undefined>();
  const [severityFilter, setSeverityFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string | undefined>();

  const { data: metrics, isLoading: metricsLoading } =
    useQuery<DashboardMetrics>({
      queryKey: ["/api/dashboard/metrics"],
    });

  const { data: stormEvents, isLoading: stormsLoading } = useQuery<
    StormEvent[]
  >({
    queryKey: ["/api/storm-events"],
  });

  const { data: allClaims } = useQuery<Claim[]>({
    queryKey: ["/api/claims"],
  });

  const approvalsUrl = approvalStatusFilter
    ? `/api/agent/approvals?status=${approvalStatusFilter}&limit=20`
    : `/api/agent/approvals?limit=20`;

  const { data: approvalsData, isLoading: approvalsLoading } = useQuery<{ approvals: ApprovalItem[] }>({
    queryKey: [approvalsUrl],
  });

  const hasFilters = stormFilter || regionFilter || severityFilter || statusFilter;

  const filteredClaims = allClaims?.filter((c) => {
    if (stormFilter && c.stormEventId !== stormFilter) return false;
    if (regionFilter && c.propertyState !== regionFilter) return false;
    if (severityFilter && c.severity !== severityFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  const filteredMetrics = hasFilters && filteredClaims
    ? {
        openClaims: filteredClaims.filter((c) => c.status !== "closed" && c.status !== "denied" && c.status !== "settled").length,
        unassignedClaims: filteredClaims.filter((c) => !c.assignedAdjusterId).length,
        avgClaimAgeDays: filteredClaims.length > 0
          ? filteredClaims.reduce((sum, c) => {
              const days = (Date.now() - new Date(c.filedDate).getTime()) / (1000 * 60 * 60 * 24);
              return sum + days;
            }, 0) / filteredClaims.length
          : 0,
        totalEstimatedLoss: filteredClaims.reduce((sum, c) => sum + (c.estimatedLoss ?? 0), 0),
      }
    : metrics;

  const displayMetrics = filteredMetrics;

  const displaySeverity = hasFilters && filteredClaims
    ? {
        catastrophic: filteredClaims.filter((c) => c.severity === "catastrophic").length,
        major: filteredClaims.filter((c) => c.severity === "major").length,
        moderate: filteredClaims.filter((c) => c.severity === "moderate").length,
        minor: filteredClaims.filter((c) => c.severity === "minor").length,
      }
    : metrics?.claimsBySeverity;

  const totalSeverity = displaySeverity
    ? displaySeverity.catastrophic +
      displaySeverity.major +
      displaySeverity.moderate +
      displaySeverity.minor
    : 0;

  const displayStatusCounts = hasFilters && filteredClaims
    ? filteredClaims.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : metrics?.claimsByStatus;

  const displayDamageTypeCounts = hasFilters && filteredClaims
    ? filteredClaims.reduce((acc, c) => {
        acc[c.damageType] = (acc[c.damageType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : metrics?.claimsByDamageType;

  const filteredStorms = stormEvents?.filter((s) => {
    if (stormFilter && s.id !== stormFilter) return false;
    if (regionFilter && !s.affectedRegions.includes(regionFilter)) return false;
    return true;
  });

  function clearFilters() {
    setStormFilter(undefined);
    setRegionFilter(undefined);
    setSeverityFilter(undefined);
    setStatusFilter(undefined);
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6" data-testid="page-dashboard">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-semibold flex items-center gap-3"
            data-testid="text-dashboard-title"
          >
            <LayoutDashboard className="h-6 w-6" />
            Claims Dashboard
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-dashboard-subtitle">
            Storm claims overview and key metrics
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 sm:flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Select
              value={stormFilter ?? ALL}
              onValueChange={(v) => setStormFilter(v === ALL ? undefined : v)}
            >
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-dashboard-storm">
                <SelectValue placeholder="All Storms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Storms</SelectItem>
                {stormEvents?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={regionFilter ?? ALL}
              onValueChange={(v) => setRegionFilter(v === ALL ? undefined : v)}
            >
              <SelectTrigger className="w-full sm:w-[140px]" data-testid="select-dashboard-region">
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Regions</SelectItem>
                {regionOptions.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={severityFilter ?? ALL}
              onValueChange={(v) => setSeverityFilter(v === ALL ? undefined : v)}
            >
              <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-dashboard-severity">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Severities</SelectItem>
                {severityFilterOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter ?? ALL}
              onValueChange={(v) => setStatusFilter(v === ALL ? undefined : v)}
            >
              <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-dashboard-status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Statuses</SelectItem>
                {claimStatusOptions.map((s) => (
                  <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-dashboard-filters">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}

            {hasFilters && filteredClaims && (
              <span className="text-sm text-muted-foreground ml-auto">
                Showing {filteredClaims.length} of {allClaims?.length ?? 0} claims
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {metricsLoading ? (
        <MetricsSkeleton />
      ) : displayMetrics ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          data-testid="metrics-row"
        >
          <Link href="/backlog">
            <Card data-testid="card-metric-open-claims" className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Open Claims
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-open-claims">
                  {displayMetrics.openClaims.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/backlog?assigned=unassigned">
            <Card data-testid="card-metric-unassigned-claims" className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle
                  className={`text-sm font-medium ${
                    displayMetrics.unassignedClaims > 0 ? "text-destructive" : ""
                  }`}
                >
                  Unassigned Claims
                </CardTitle>
                <Users
                  className={`h-4 w-4 ${
                    displayMetrics.unassignedClaims > 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    displayMetrics.unassignedClaims > 0 ? "text-destructive" : ""
                  }`}
                  data-testid="value-unassigned-claims"
                >
                  {displayMetrics.unassignedClaims.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card data-testid="card-metric-avg-age">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Claim Age
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="value-avg-age">
                {displayMetrics.avgClaimAgeDays.toFixed(1)} days
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-metric-estimated-loss">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Estimated Loss
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="value-estimated-loss">
                {formatCurrency(displayMetrics.totalEstimatedLoss)}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CloudLightning className="h-5 w-5" />
          Claims by Storm
        </h2>
        {stormsLoading ? (
          <StormsSkeleton />
        ) : filteredStorms && filteredStorms.length > 0 ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            data-testid="storms-grid"
          >
            {filteredStorms.map((storm) => (
              <Card key={storm.id} data-testid={`card-storm-${storm.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base">{storm.name}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">Cat {storm.category}</Badge>
                      <Badge variant={stormStatusVariant(storm.status)}>
                        {storm.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {storm.affectedRegions.map((region) => (
                      <Badge
                        key={region}
                        variant="outline"
                        className="text-xs"
                      >
                        {region}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                    <span className="text-muted-foreground">
                      {storm.totalClaims.toLocaleString()} claims
                    </span>
                    <span className="font-medium">
                      {formatCurrencyFull(storm.estimatedTotalLoss)}
                    </span>
                  </div>
                  <Link href={`/backlog?stormEventId=${storm.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      data-testid={`link-storm-backlog-${storm.id}`}
                    >
                      View Claims
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No storm events found.
          </p>
        )}
      </div>

      {metricsLoading ? (
        <SeveritySkeleton />
      ) : displaySeverity ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Claims by Severity
          </h2>
          <Card data-testid="card-severity-breakdown">
            <CardContent className="p-6 space-y-4">
              {(
                Object.keys(severityConfig) as Array<
                  keyof typeof severityConfig
                >
              ).map((key) => {
                const count =
                  displaySeverity[
                    key as keyof typeof displaySeverity
                  ];
                const percentage =
                  totalSeverity > 0
                    ? Math.round((count / totalSeverity) * 100)
                    : 0;
                const config = severityConfig[key];
                return (
                  <div
                    key={key}
                    className="space-y-1.5"
                    data-testid={`severity-${key}`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap text-sm">
                      <span className="font-medium">{config.label}</span>
                      <span className="text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all ${config.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {metricsLoading ? (
        <GridSkeleton count={8} />
      ) : displayStatusCounts ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Claims by Status
          </h2>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            data-testid="status-grid"
          >
            {Object.entries(displayStatusCounts).map(([status, count]) => (
                <Card
                  key={status}
                  data-testid={`card-status-${status}`}
                  className={`cursor-pointer transition-shadow ${statusFilter === status ? "ring-2 ring-primary shadow-md" : "hover:shadow-md"}`}
                  onClick={() => setStatusFilter(statusFilter === status ? undefined : status)}
                >
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground capitalize">
                      {statusLabels[status] || status.replace(/_/g, " ")}
                    </p>
                    <p className="text-xl font-bold mt-1">
                      {(count as number).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ) : null}

      {metricsLoading ? (
        <GridSkeleton count={6} />
      ) : displayDamageTypeCounts ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wind className="h-5 w-5" />
            Claims by Damage Type
          </h2>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            data-testid="damage-type-grid"
          >
            {displayDamageTypeCounts &&
              Object.entries(displayDamageTypeCounts).map(
                ([type, count]) => {
                  const Icon = damageTypeIcons[type] || FileText;
                  return (
                    <Card key={type} data-testid={`card-damage-${type}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            {damageTypeLabels[type] || type}
                          </p>
                        </div>
                        <p className="text-xl font-bold">
                          {(count as number).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  );
                }
              )}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Recent Agent Approvals
          </h2>
          <div className="flex items-center gap-2">
            {(["pending", "approved", "rejected"] as const).map((s) => {
              const config = approvalStatusConfig[s];
              const Icon = config.icon;
              return (
                <Button
                  key={s}
                  variant={approvalStatusFilter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setApprovalStatusFilter(approvalStatusFilter === s ? undefined : s)}
                  data-testid={`button-approval-filter-${s}`}
                >
                  <Icon className="h-3.5 w-3.5 mr-1.5" />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>

        {approvalsLoading ? (
          <Card>
            <CardContent className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : approvalsData?.approvals && approvalsData.approvals.length > 0 ? (
          <Card data-testid="card-recent-approvals">
            <CardContent className="p-0">
              <div className="divide-y">
                {approvalsData.approvals.map((item) => {
                  const config = approvalStatusConfig[item.status] || approvalStatusConfig.pending;
                  const StatusIcon = config.icon;
                  const agentDisplayName = agentNameMap[item.agentId] || item.agentId;
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-4"
                      data-testid={`approval-item-${item.id}`}
                    >
                      <div className={`mt-0.5 ${config.className}`}>
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">
                            {item.action}
                          </span>
                          <Badge variant={item.status === "approved" ? "default" : item.status === "rejected" ? "destructive" : "secondary"} className="text-xs">
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Bot className="h-3 w-3" />
                            {agentDisplayName}
                          </span>
                          {item.reviewedBy && (
                            <span>
                              by {item.reviewedBy}
                            </span>
                          )}
                          <span>{formatRelativeTime(item.createdAt)}</span>
                        </div>
                        {item.reviewNotes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {item.reviewNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No approval activity found{approvalStatusFilter ? ` with status "${approvalStatusFilter}"` : ""}.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
