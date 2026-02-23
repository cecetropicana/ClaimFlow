import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Bot,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  Activity,
  Cloud,
  BarChart3,
  Network,
  Upload,
  Clock,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  History,
  UserCheck,
  ArrowRightLeft,
  Circle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClaimActivity } from "@shared/schema";

interface AgentInfo {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  trustLevel: string;
  trustScore: number;
  totalDecisions: number;
  successRate: number;
  lastActive: string | null;
}

interface GovernanceInfo {
  provider: string;
  configured: boolean;
  connected: boolean;
  latencyMs?: number;
  error?: string;
  mode: string;
}

interface ConnectionStatusResponse {
  agents: AgentInfo[];
  governance: GovernanceInfo;
  timestamp: string;
}

interface SyncStatusResponse {
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
    createdAt: string;
  }>;
}

interface AgentPerformance {
  id: string;
  name: string;
  type: string;
  trustLevel: string;
  trustScore: number;
  totalDecisions: number;
  successfulDecisions: number;
  successRate: number;
  approvals: number;
  rejections: number;
  pending: number;
  lastActive: string | null;
}

type SortField = "name" | "trustScore" | "totalDecisions" | "successRate" | "approvals" | "rejections" | "pending";
type SortDir = "asc" | "desc";

const AGENT_ICONS: Record<string, typeof Bot> = {
  supervisor: Bot,
  claims_triage: Shield,
  backlog_analysis: BarChart3,
  adjuster_management: Network,
  storm_assessment: Cloud,
};

const TRUST_LEVEL_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  supervised: "secondary",
  guided: "default",
  semi_autonomous: "outline",
};

const TRUST_LEVEL_LABELS: Record<string, string> = {
  supervised: "Supervised",
  guided: "Guided",
  semi_autonomous: "Semi-Autonomous",
};

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

function AgentActivityFeed({ agentName, allActivity }: { agentName: string; allActivity: ClaimActivity[] }) {
  const agentActivity = useMemo(() => {
    const nameLower = agentName.toLowerCase();
    return allActivity
      .filter(a => a.performedBy.toLowerCase() === nameLower)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [agentName, allActivity]);

  if (agentActivity.length === 0) {
    return (
      <div className="ml-12 mr-3 mb-3 p-3 rounded-md bg-muted/50 text-sm text-muted-foreground" data-testid={`text-no-agent-activity-${agentName}`}>
        No activity recorded for this agent yet.
      </div>
    );
  }

  return (
    <div className="ml-12 mr-3 mb-3 space-y-0" data-testid={`feed-agent-activity-${agentName}`}>
      <div className="flex items-center gap-2 mb-2">
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Activity Trail ({agentActivity.length})</span>
      </div>
      {agentActivity.slice(0, 10).map((entry, idx) => {
        const isLast = idx === Math.min(agentActivity.length, 10) - 1;
        const actionIcon = entry.action === "assignment" || entry.action === "reassignment"
          ? <UserCheck className="h-3 w-3" />
          : entry.action === "status_change"
          ? <ArrowRightLeft className="h-3 w-3" />
          : <Circle className="h-3 w-3" />;

        const actionColor = entry.action === "assignment" || entry.action === "reassignment"
          ? "text-blue-500 bg-blue-500/10 border-blue-500/30"
          : entry.action === "status_change"
          ? "text-orange-500 bg-orange-500/10 border-orange-500/30"
          : "text-muted-foreground bg-muted border-border";

        return (
          <div key={entry.id} className="flex gap-2.5" data-testid={`agent-activity-${entry.id}`}>
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center h-5 w-5 rounded-full border shrink-0 ${actionColor}`}>
                {actionIcon}
              </div>
              {!isLast && <div className="w-px flex-1 bg-border min-h-[16px]" />}
            </div>
            <div className="pb-2.5 min-w-0">
              <p className="text-xs font-medium">{entry.details}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  Claim {entry.claimId}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      {agentActivity.length > 10 && (
        <p className="text-xs text-muted-foreground pl-7">
          + {agentActivity.length - 10} more entries
        </p>
      )}
    </div>
  );
}

export default function AgentStatus() {
  const { toast } = useToast();
  const [sortField, setSortField] = useState<SortField>("approvals");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery<ConnectionStatusResponse>({
    queryKey: ["/api/agent/connection-status"],
    refetchInterval: 30000,
  });

  const { data: syncData, isLoading: syncLoading, refetch: refetchSync } = useQuery<SyncStatusResponse>({
    queryKey: ["/api/agent/sync-status"],
    refetchInterval: 30000,
  });

  const { data: perfData, isLoading: perfLoading } = useQuery<{ performance: AgentPerformance[] }>({
    queryKey: ["/api/agent/performance"],
    refetchInterval: 30000,
  });

  const { data: allActivity } = useQuery<ClaimActivity[]>({
    queryKey: ["/api/activity"],
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/agent/sync"),
    onSuccess: () => {
      toast({ title: "Sync Complete", description: "Pending decisions synced to Averecion" });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/sync-status"] });
    },
    onError: () => {
      toast({ title: "Sync Failed", description: "Could not sync decisions", variant: "destructive" });
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/agent/sync/retry-failed"),
    onSuccess: () => {
      toast({ title: "Retry Queued", description: "Failed items reset for retry" });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/sync-status"] });
    },
    onError: () => {
      toast({ title: "Retry Failed", description: "Could not reset failed items", variant: "destructive" });
    },
  });

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchSync()]);
    queryClient.invalidateQueries({ queryKey: ["/api/agent/connection-status"] });
    queryClient.invalidateQueries({ queryKey: ["/api/agent/sync-status"] });
    queryClient.invalidateQueries({ queryKey: ["/api/agent/performance"] });
    toast({ title: "Refreshed", description: "Status updated" });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortedPerformance = (perfData?.performance || []).slice().sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    const aNum = Number(aVal) || 0;
    const bNum = Number(bVal) || 0;
    return sortDir === "asc" ? aNum - bNum : bNum - aNum;
  });

  const agents = data?.agents || [];
  const governance = data?.governance;

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Agent Status</h1>
            <p className="text-muted-foreground">
              View all agents, performance metrics, and governance platform connection
            </p>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            disabled={isFetching}
            data-testid="button-refresh-status"
          >
            {isFetching ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Agent Performance Comparison
            </CardTitle>
            <CardDescription>Sort by any column to compare agent performance</CardDescription>
          </CardHeader>
          <CardContent>
            {perfLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : sortedPerformance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No agent performance data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHeader label="Agent" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <TableHead>Trust Level</TableHead>
                      <SortHeader label="Trust Score" field="trustScore" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Decisions" field="totalDecisions" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Success Rate" field="successRate" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Approvals" field="approvals" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Rejections" field="rejections" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Pending" field="pending" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPerformance.map((agent) => {
                      const IconComponent = AGENT_ICONS[agent.type] || Bot;
                      const maxDecisions = Math.max(...sortedPerformance.map(a => a.totalDecisions), 1);
                      const barWidth = agent.totalDecisions > 0 ? (agent.totalDecisions / maxDecisions) * 100 : 0;
                      return (
                        <TableRow key={agent.id} data-testid={`row-agent-${agent.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded bg-primary/10">
                                <IconComponent className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <span className="font-medium text-sm">{agent.name}</span>
                                {agent.lastActive && (
                                  <div className="text-xs text-muted-foreground">
                                    Last: {new Date(agent.lastActive).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={TRUST_LEVEL_COLORS[agent.trustLevel] || "secondary"}>
                              {TRUST_LEVEL_LABELS[agent.trustLevel] || agent.trustLevel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${(agent.trustScore) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm tabular-nums">{(agent.trustScore * 100).toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-blue-500 transition-all"
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              <span className="text-sm tabular-nums">{agent.totalDecisions}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm font-medium tabular-nums ${
                              agent.totalDecisions === 0
                                ? "text-muted-foreground"
                                : agent.successRate >= 80
                                  ? "text-green-600 dark:text-green-400"
                                  : agent.successRate >= 50
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-destructive"
                            }`}>
                              {agent.totalDecisions > 0 ? `${agent.successRate}%` : "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium tabular-nums text-green-600 dark:text-green-400">
                              {agent.approvals}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium tabular-nums text-destructive">
                              {agent.rejections}
                            </span>
                          </TableCell>
                          <TableCell>
                            {agent.pending > 0 ? (
                              <Badge variant="secondary" className="tabular-nums">
                                {agent.pending}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground tabular-nums">0</span>
                            )}
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Governance Platform
            </CardTitle>
            <CardDescription>Averecion API connection status</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : governance ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-4">
                    {governance.connected ? (
                      <div className="p-2 rounded-full bg-green-500/10">
                        <Wifi className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                    ) : governance.configured ? (
                      <div className="p-2 rounded-full bg-yellow-500/10">
                        <WifiOff className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-full bg-muted">
                        <WifiOff className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-lg">{governance.provider}</span>
                        {governance.connected ? (
                          <Badge variant="default" className="bg-green-600 dark:bg-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                        ) : governance.configured ? (
                          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Configured (Offline)
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="w-3 h-3 mr-1" />
                            Not Configured
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Mode: {governance.mode === "external" ? "External Governance" : "Local Governance Rules"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {governance.latencyMs !== undefined && (
                      <div className="text-sm text-muted-foreground">
                        Latency: {governance.latencyMs}ms
                      </div>
                    )}
                    {governance.error && (
                      <div className="text-sm text-destructive mt-1">
                        {governance.error}
                      </div>
                    )}
                  </div>
                </div>

                {!governance.configured && (
                  <div className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/5">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                      <div>
                        <p className="font-medium">API Key Required</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add your Averecion API key to enable external governance. 
                          The system is currently using local governance rules.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Unable to load governance status
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Offline Sync Queue
            </CardTitle>
            <CardDescription>
              Decisions made offline are synced when connection is restored
            </CardDescription>
          </CardHeader>
          <CardContent>
            {syncLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : syncData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <div className="text-2xl font-bold">{syncData.pending}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{syncData.synced}</div>
                    <div className="text-sm text-muted-foreground">Synced</div>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <div className="text-2xl font-bold text-destructive">{syncData.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 flex-wrap text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {syncData.lastSuccessfulSync ? (
                      <span>Last sync: {new Date(syncData.lastSuccessfulSync).toLocaleString()}</span>
                    ) : (
                      <span>No sync yet</span>
                    )}
                  </div>
                  {syncData.isRunning && (
                    <Badge variant="secondary">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Syncing...
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending || syncData.pending === 0}
                    variant="outline"
                    data-testid="button-sync-now"
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Sync Now
                  </Button>
                  {syncData.failed > 0 && (
                    <Button
                      onClick={() => retryMutation.mutate()}
                      disabled={retryMutation.isPending}
                      variant="outline"
                      data-testid="button-retry-failed"
                    >
                      {retryMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4 mr-2" />
                      )}
                      Retry Failed
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Unable to load sync status
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Active Agents
            </CardTitle>
            <CardDescription>
              {agents.length} agents registered in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No agents registered
              </div>
            ) : (
              <div className="space-y-3">
                {agents.map((agent, index) => {
                  const IconComponent = AGENT_ICONS[agent.type] || Bot;
                  return (
                    <div key={agent.id}>
                      {index > 0 && <Separator className="my-3" />}
                      <button
                        className="flex items-start gap-4 p-3 rounded-lg hover-elevate w-full text-left"
                        onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
                        data-testid={`card-agent-${agent.id}`}
                      >
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IconComponent className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{agent.name}</span>
                            <Badge variant="default" className="bg-green-600 dark:bg-green-700">
                              <Activity className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                            <Badge variant={TRUST_LEVEL_COLORS[agent.trustLevel] || "secondary"}>
                              {TRUST_LEVEL_LABELS[agent.trustLevel] || agent.trustLevel}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {agent.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                            <span>Trust Score: {(agent.trustScore * 100).toFixed(0)}%</span>
                            <span>Decisions: {agent.totalDecisions}</span>
                            <span>Success Rate: {agent.successRate.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="shrink-0 mt-1">
                          {expandedAgent === agent.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>
                      {expandedAgent === agent.id && (
                        <AgentActivityFeed agentName={agent.name} allActivity={allActivity || []} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {data?.timestamp && (
          <p className="text-xs text-center text-muted-foreground">
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
