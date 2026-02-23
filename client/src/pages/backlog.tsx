import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToastAction } from "@/components/ui/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListTodo, X, UserCheck, DollarSign, FileText, RefreshCw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Claim, StormEvent, Adjuster, ClaimsFilter } from "@shared/schema";

const ALL = "__all__";

const severityOptions = ["catastrophic", "major", "moderate", "minor"] as const;
const statusOptions = ["new", "triaged", "assigned", "inspected", "estimated", "approved", "settled", "closed", "denied"] as const;
const damageTypeOptions = ["wind", "flood", "hail", "fire", "lightning", "debris", "water_damage", "structural", "other"] as const;

function severityVariant(severity: string) {
  switch (severity) {
    case "catastrophic": return "destructive" as const;
    case "major": return "default" as const;
    case "moderate": return "secondary" as const;
    case "minor": return "outline" as const;
    default: return "secondary" as const;
  }
}

function statusVariant(status: string) {
  switch (status) {
    case "new": return "outline" as const;
    case "triaged": return "secondary" as const;
    case "assigned": return "default" as const;
    case "inspected": return "default" as const;
    case "estimated": return "secondary" as const;
    case "approved": return "default" as const;
    case "settled": return "secondary" as const;
    case "closed": return "outline" as const;
    case "denied": return "destructive" as const;
    default: return "secondary" as const;
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function priorityColor(priority: number): string {
  if (priority >= 8) return "text-destructive";
  if (priority >= 5) return "text-orange-600 dark:text-orange-400";
  if (priority >= 3) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

function damageTypeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildQueryString(filters: ClaimsFilter): string {
  const params = new URLSearchParams();
  if (filters.stormEventId) params.set("stormEventId", filters.stormEventId);
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.status) params.set("status", filters.status);
  if (filters.damageType) params.set("damageType", filters.damageType);
  if (filters.unassignedOnly) params.set("unassignedOnly", "true");
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

const defaultFilters: ClaimsFilter = {
  sortBy: "priority",
  sortOrder: "desc",
};

export default function BacklogPage() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ClaimsFilter>(defaultFilters);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignAdjusterId, setAssignAdjusterId] = useState("");
  const [bulkStatusValue, setBulkStatusValue] = useState("");

  const claimsQuery = useQuery<Claim[]>({
    queryKey: ["/api/claims", filters],
    queryFn: async () => {
      const res = await fetch(`/api/claims${buildQueryString(filters)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
  });

  const stormsQuery = useQuery<StormEvent[]>({
    queryKey: ["/api/storm-events"],
  });

  const adjustersQuery = useQuery<Adjuster[]>({
    queryKey: ["/api/adjusters"],
  });

  const bulkAssignMutation = useMutation({
    mutationFn: async (data: { claimIds: string[]; adjusterId: string; force?: boolean }) => {
      await apiRequest("POST", "/api/claims/bulk-assign", data);
    },
    onSuccess: () => {
      toast({ title: "Claims assigned successfully" });
      setSelectedIds(new Set());
      setAssignAdjusterId("");
      queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/adjusters"] });
    },
    onError: (error: Error) => {
      try {
        const body = JSON.parse(error.message.replace(/^\d+:\s*/, ""));
        if (body.warning) {
          toast({
            title: "Assignment Warning",
            description: `${body.error}. Assign anyway?`,
            variant: "destructive",
            action: (
              <ToastAction
                altText="Force assign"
                onClick={() => bulkAssignMutation.mutate({
                  claimIds: Array.from(selectedIds),
                  adjusterId: assignAdjusterId,
                  force: true,
                })}
                data-testid="button-force-bulk-assign"
              >
                Force Assign
              </ToastAction>
            ),
          });
          return;
        }
      } catch {}
      toast({
        title: "Failed to assign claims",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async (data: { claimIds: string[]; status: string }) => {
      await apiRequest("POST", "/api/claims/bulk-status", data);
    },
    onSuccess: () => {
      toast({ title: "Status updated for selected claims" });
      setSelectedIds(new Set());
      setBulkStatusValue("");
      queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const claims = claimsQuery.data ?? [];
  const storms = stormsQuery.data ?? [];
  const adjusters = adjustersQuery.data ?? [];

  const stormMap = useMemo(() => {
    const map = new Map<string, string>();
    storms.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [storms]);

  const totalEstimatedLoss = useMemo(
    () => claims.reduce((sum, c) => sum + (c.estimatedLoss ?? 0), 0),
    [claims]
  );

  const allSelected = claims.length > 0 && selectedIds.size === claims.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < claims.length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(claims.map((c) => c.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setFilters(defaultFilters);
  }

  function updateFilter<K extends keyof ClaimsFilter>(key: K, value: ClaimsFilter[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setSelectedIds(new Set());
  }

  const hasActiveFilters =
    filters.stormEventId ||
    filters.severity ||
    filters.status ||
    filters.damageType ||
    filters.unassignedOnly;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6" data-testid="page-backlog">
      <div className="flex items-center gap-3">
        <ListTodo className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            Backlog Queue
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and triage pending insurance claims from storm events
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total Results</p>
              {claimsQuery.isLoading ? (
                <Skeleton className="h-5 w-12" />
              ) : (
                <p className="text-lg font-semibold" data-testid="text-total-results">
                  {claims.length.toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <DollarSign className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total Est. Loss</p>
              {claimsQuery.isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <p className="text-lg font-semibold" data-testid="text-total-loss">
                  {formatCurrency(totalEstimatedLoss)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 sm:flex-wrap">
            <Select
              value={filters.stormEventId ?? ALL}
              onValueChange={(v) =>
                updateFilter("stormEventId", v === ALL ? undefined : v)
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-storm-event">
                <SelectValue placeholder="All Storms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Storms</SelectItem>
                {storms.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.severity ?? ALL}
              onValueChange={(v) =>
                updateFilter("severity", v === ALL ? undefined : (v as any))
              }
            >
              <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-severity">
                <SelectValue placeholder="All Severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Severities</SelectItem>
                {severityOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status ?? ALL}
              onValueChange={(v) =>
                updateFilter("status", v === ALL ? undefined : (v as any))
              }
            >
              <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-status">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.damageType ?? ALL}
              onValueChange={(v) =>
                updateFilter("damageType", v === ALL ? undefined : (v as any))
              }
            >
              <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-damage-type">
                <SelectValue placeholder="All Damage Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Damage Types</SelectItem>
                {damageTypeOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {damageTypeLabel(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={filters.unassignedOnly ?? false}
                onCheckedChange={(checked) =>
                  updateFilter("unassignedOnly", checked === true ? true : undefined)
                }
                data-testid="checkbox-unassigned-only"
              />
              <span className="text-sm">Unassigned Only</span>
            </label>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedIds.size > 0 && (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-sm font-medium w-full sm:w-auto" data-testid="text-selected-count">
                {selectedIds.size} claim{selectedIds.size !== 1 ? "s" : ""} selected
              </span>

              <Select
                value={assignAdjusterId || ALL}
                onValueChange={(v) => setAssignAdjusterId(v === ALL ? "" : v)}
              >
                <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-assign-adjuster">
                  <SelectValue placeholder="Select Adjuster" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Select Adjuster</SelectItem>
                  {adjusters
                    .filter((a) => a.status !== "unavailable")
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.currentCaseload}/{a.maxCaseload})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                disabled={!assignAdjusterId || bulkAssignMutation.isPending}
                onClick={() =>
                  bulkAssignMutation.mutate({
                    claimIds: Array.from(selectedIds),
                    adjusterId: assignAdjusterId,
                  })
                }
                data-testid="button-assign-selected"
              >
                <UserCheck className="h-4 w-4 mr-1" />
                {bulkAssignMutation.isPending ? "Assigning..." : "Assign Selected"}
              </Button>

              <div className="hidden sm:block h-6 w-px bg-border mx-1" />

              <Select
                value={bulkStatusValue || ALL}
                onValueChange={(v) => setBulkStatusValue(v === ALL ? "" : v)}
              >
                <SelectTrigger className="w-full sm:w-[160px]" data-testid="select-bulk-status">
                  <SelectValue placeholder="Change Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Change Status</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                disabled={!bulkStatusValue || bulkStatusMutation.isPending}
                onClick={() =>
                  bulkStatusMutation.mutate({
                    claimIds: Array.from(selectedIds),
                    status: bulkStatusValue,
                  })
                }
                data-testid="button-status-selected"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {bulkStatusMutation.isPending ? "Updating..." : "Update Status"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                data-testid="button-clear-selection"
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {claimsQuery.isLoading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : claims.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ListTodo className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground" data-testid="text-no-results">
              No claims match the current filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={allSelected}
                        ref={(el) => {
                          if (el) {
                            (el as unknown as HTMLButtonElement).dataset.state =
                              someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked";
                          }
                        }}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Claim #</TableHead>
                    <TableHead className="hidden md:table-cell">Policyholder</TableHead>
                    <TableHead className="hidden lg:table-cell">Property</TableHead>
                    <TableHead className="hidden lg:table-cell">Storm Event</TableHead>
                    <TableHead className="hidden sm:table-cell">Damage</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Est. Loss</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Priority</TableHead>
                    <TableHead className="hidden md:table-cell">Assigned To</TableHead>
                    <TableHead className="hidden lg:table-cell">Filed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow
                      key={claim.id}
                      data-state={selectedIds.has(claim.id) ? "selected" : undefined}
                      data-testid={`row-claim-${claim.id}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(claim.id)}
                          onCheckedChange={() => toggleSelect(claim.id)}
                          data-testid={`checkbox-claim-${claim.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/triage/${claim.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline whitespace-nowrap"
                          data-testid={`link-claim-${claim.id}`}
                        >
                          {claim.claimNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell" data-testid={`text-policyholder-${claim.id}`}>
                        {claim.policyholderName}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {claim.propertyCity}, {claim.propertyState}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {stormMap.get(claim.stormEventId) ?? claim.stormEventId}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="no-default-active-elevate">
                          {damageTypeLabel(claim.damageType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={severityVariant(claim.severity)}
                          className="no-default-active-elevate"
                        >
                          {claim.severity.charAt(0).toUpperCase() + claim.severity.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusVariant(claim.status)}
                          className="no-default-active-elevate"
                        >
                          {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">
                        {claim.estimatedLoss != null
                          ? formatCurrency(claim.estimatedLoss)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <span
                          className={`font-semibold tabular-nums ${priorityColor(claim.priority)}`}
                          data-testid={`text-priority-${claim.id}`}
                        >
                          {claim.priority}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {claim.assignedAdjusterName ? (
                          <span data-testid={`text-adjuster-${claim.id}`}>
                            {claim.assignedAdjusterName}
                          </span>
                        ) : (
                          <span className="text-muted-foreground" data-testid={`text-adjuster-${claim.id}`}>
                            Unassigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground whitespace-nowrap">
                        {formatDate(claim.filedDate)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
