import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Adjuster, Claim } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  User,
  MapPin,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  TableIcon,
  Filter,
} from "lucide-react";

type SortField = "name" | "currentCaseload" | "utilization" | "status" | "region" | "claimsHandled";
type SortDir = "asc" | "desc";
type ViewMode = "cards" | "table";
type StatusFilter = "all" | "available" | "busy" | "unavailable";

function AdjusterCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}

function getStatusBadge(status: Adjuster["status"]) {
  switch (status) {
    case "available":
      return (
        <Badge variant="outline" className="text-green-700 dark:text-green-400 border-green-300 dark:border-green-700" data-testid="badge-status-available">
          Available
        </Badge>
      );
    case "busy":
      return (
        <Badge variant="destructive" data-testid="badge-status-busy">
          Busy
        </Badge>
      );
    case "unavailable":
      return (
        <Badge variant="secondary" data-testid="badge-status-unavailable">
          Unavailable
        </Badge>
      );
  }
}

function SortHeader({ label, field, sortField, sortDir, onSort }: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  return (
    <TableHead>
      <button
        className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
        onClick={() => onSort(field)}
        data-testid={`sort-${field}`}
      >
        {label}
        {sortField === field ? (
          sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

export default function AdjustersPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortField, setSortField] = useState<SortField>("utilization");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [specialtyFilter, setSpecialtyFilter] = useState<string>("all");

  const { data: adjusters, isLoading: adjustersLoading } = useQuery<Adjuster[]>({
    queryKey: ["/api/adjusters"],
  });

  const { data: claims } = useQuery<Claim[]>({
    queryKey: ["/api/claims"],
  });

  const claimsByAdjuster = useMemo(() => {
    if (!claims) return new Map<string, { total: number; open: number; closed: number; denied: number }>();
    const map = new Map<string, { total: number; open: number; closed: number; denied: number }>();
    for (const claim of claims) {
      if (!claim.assignedAdjusterId) continue;
      const entry = map.get(claim.assignedAdjusterId) || { total: 0, open: 0, closed: 0, denied: 0 };
      entry.total++;
      if (claim.status === "closed" || claim.status === "settled") entry.closed++;
      else if (claim.status === "denied") entry.denied++;
      else entry.open++;
      map.set(claim.assignedAdjusterId, entry);
    }
    return map;
  }, [claims]);

  const allSpecialties = useMemo(() => {
    if (!adjusters) return [];
    const set = new Set<string>();
    adjusters.forEach(a => a.specialties.forEach(s => set.add(s)));
    return Array.from(set).sort();
  }, [adjusters]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filteredAdjusters = useMemo(() => {
    if (!adjusters) return [];
    let result = adjusters;
    if (statusFilter !== "all") {
      result = result.filter(a => a.status === statusFilter);
    }
    if (specialtyFilter !== "all") {
      result = result.filter(a => a.specialties.includes(specialtyFilter));
    }
    return result.slice().sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      switch (sortField) {
        case "name":
          aVal = a.name; bVal = b.name;
          break;
        case "currentCaseload":
          aVal = a.currentCaseload; bVal = b.currentCaseload;
          break;
        case "utilization":
          aVal = a.maxCaseload > 0 ? a.currentCaseload / a.maxCaseload : 0;
          bVal = b.maxCaseload > 0 ? b.currentCaseload / b.maxCaseload : 0;
          break;
        case "status":
          const order = { available: 0, busy: 1, unavailable: 2 };
          aVal = order[a.status]; bVal = order[b.status];
          break;
        case "region":
          aVal = a.region; bVal = b.region;
          break;
        case "claimsHandled":
          aVal = claimsByAdjuster.get(a.id)?.total || 0;
          bVal = claimsByAdjuster.get(b.id)?.total || 0;
          break;
        default:
          aVal = 0; bVal = 0;
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
  }, [adjusters, statusFilter, specialtyFilter, sortField, sortDir, claimsByAdjuster]);

  const totalAdjusters = adjusters?.length ?? 0;
  const availableAdjusters = adjusters?.filter((a) => a.status === "available").length ?? 0;
  const avgUtilization =
    adjusters && adjusters.length > 0
      ? Math.round(
          (adjusters.reduce((sum, a) => sum + (a.maxCaseload > 0 ? a.currentCaseload / a.maxCaseload : 0), 0) /
            adjusters.length) *
            100
        )
      : 0;

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">
              Adjuster Workload
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">
              Monitor adjuster capacity, caseload, and performance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
            data-testid="button-view-cards"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            data-testid="button-view-table"
          >
            <TableIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {adjustersLoading ? (
          <>
            <Card><CardContent className="py-6"><Skeleton className="h-8 w-16" /></CardContent></Card>
            <Card><CardContent className="py-6"><Skeleton className="h-8 w-16" /></CardContent></Card>
            <Card><CardContent className="py-6"><Skeleton className="h-8 w-16" /></CardContent></Card>
          </>
        ) : (
          <>
            <Card data-testid="card-metric-total">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Adjusters</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-adjusters">
                  {totalAdjusters}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-metric-available">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Adjusters</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-available-adjusters">
                  {availableAdjusters}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-metric-utilization">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-utilization">
                  {avgUtilization}%
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[140px]" data-testid="filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
        <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
          <SelectTrigger className="w-[160px]" data-testid="filter-specialty">
            <SelectValue placeholder="Specialty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            {allSpecialties.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredAdjusters.length} of {totalAdjusters} adjusters
        </span>
      </div>

      {viewMode === "table" ? (
        <Card>
          <CardContent className="p-0">
            {adjustersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Skeleton className="h-6 w-32" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHeader label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Region" field="region" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <TableHead>Specialties</TableHead>
                      <SortHeader label="Caseload" field="currentCaseload" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Utilization" field="utilization" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Claims Handled" field="claimsHandled" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdjusters.map((adjuster) => {
                      const utilization = adjuster.maxCaseload > 0
                        ? Math.round((adjuster.currentCaseload / adjuster.maxCaseload) * 100)
                        : 0;
                      const claimStats = claimsByAdjuster.get(adjuster.id) || { total: 0, open: 0, closed: 0, denied: 0 };

                      return (
                        <TableRow key={adjuster.id} data-testid={`row-adjuster-${adjuster.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{adjuster.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(adjuster.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              {adjuster.region}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {adjuster.specialties.map(s => (
                                <Badge key={s} variant="outline" className="text-xs no-default-hover-elevate">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm tabular-nums">
                              {adjuster.currentCaseload}/{adjuster.maxCaseload}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    utilization > 80 ? "bg-destructive" : utilization > 50 ? "bg-yellow-500" : "bg-green-500"
                                  }`}
                                  style={{ width: `${utilization}%` }}
                                />
                              </div>
                              <span className={`text-sm tabular-nums font-medium ${
                                utilization > 80 ? "text-destructive" : ""
                              }`}>
                                {utilization}%
                              </span>
                              {utilization > 80 && <AlertTriangle className="w-3 h-3 text-destructive" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm tabular-nums">
                              <span className="font-medium">{claimStats.total}</span>
                              {claimStats.total > 0 && (
                                <span className="text-muted-foreground text-xs">
                                  ({claimStats.open} open, {claimStats.closed} closed{claimStats.denied > 0 ? `, ${claimStats.denied} denied` : ""})
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adjustersLoading ? (
            <>
              <AdjusterCardSkeleton />
              <AdjusterCardSkeleton />
              <AdjusterCardSkeleton />
              <AdjusterCardSkeleton />
              <AdjusterCardSkeleton />
              <AdjusterCardSkeleton />
            </>
          ) : (
            filteredAdjusters.map((adjuster) => {
              const utilization =
                adjuster.maxCaseload > 0
                  ? (adjuster.currentCaseload / adjuster.maxCaseload) * 100
                  : 0;
              const isHighLoad = utilization > 80;
              const claimStats = claimsByAdjuster.get(adjuster.id) || { total: 0, open: 0, closed: 0, denied: 0 };

              return (
                <Card key={adjuster.id} data-testid={`card-adjuster-${adjuster.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg" data-testid={`text-adjuster-name-${adjuster.id}`}>
                          {adjuster.name}
                        </CardTitle>
                      </div>
                      {getStatusBadge(adjuster.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span data-testid={`text-adjuster-region-${adjuster.id}`}>{adjuster.region}</span>
                    </div>

                    {adjuster.specialties.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {adjuster.specialties.map((specialty) => (
                          <Badge
                            key={specialty}
                            variant="outline"
                            className="text-xs no-default-hover-elevate"
                            data-testid={`badge-specialty-${adjuster.id}-${specialty}`}
                          >
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground" data-testid={`text-caseload-${adjuster.id}`}>
                          {adjuster.currentCaseload}/{adjuster.maxCaseload} claims
                        </span>
                        {isHighLoad && (
                          <div className="flex items-center gap-1 text-sm text-destructive" data-testid={`indicator-high-load-${adjuster.id}`}>
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>High load</span>
                          </div>
                        )}
                      </div>
                      <Progress
                        value={utilization}
                        className="h-2"
                        data-testid={`progress-caseload-${adjuster.id}`}
                      />
                    </div>

                    {claimStats.total > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {claimStats.total} claims handled ({claimStats.open} open, {claimStats.closed} closed{claimStats.denied > 0 ? `, ${claimStats.denied} denied` : ""})
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
