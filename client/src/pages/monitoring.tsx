import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Activity,
  Bot,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Database,
  ArrowUpCircle,
  Loader2,
  Play,
  Zap
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface AgentStatus {
  agentId: string;
  type: string;
  trustLevel: string;
  trustScore: number;
  totalDecisions: number;
  successRate: number;
}

interface CacheStats {
  size: number;
  maxEntries: number;
  hitRate: number;
}

interface AutonomyProgress {
  current: number;
  required: number;
  met: boolean;
}

interface AutonomyStatus {
  agentId: string;
  currentLevel: string;
  nextLevel: string | null;
  promotionEligible: boolean;
  progress: Record<string, AutonomyProgress>;
}

interface AuditLog {
  id: number;
  correlationId: string;
  agentId: string;
  action: string;
  decision: string;
  confidenceScore: number;
  latencyMs: number;
  createdAt: string;
}

interface ConnectionAgent {
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

interface GovernanceStatus {
  provider: string;
  configured: boolean;
  connected: boolean;
  latencyMs: number;
  error?: string;
  mode: string;
}

interface ConnectionStatus {
  agents: ConnectionAgent[];
  governance: GovernanceStatus;
  timestamp: string;
}

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

const AGENT_TEST_QUERIES: Record<string, { query: string; description: string }> = {
  "supervisor-main": { 
    query: "Show claims backlog summary and identify unassigned critical claims", 
    description: "Routes to specialized agents, creates alerts & work orders" 
  },
  "claims-triage-agent": { 
    query: "Triage claim CLM-2847 and assess damage severity for wind damage in Tampa FL", 
    description: "Claims triage and severity classification" 
  },
  "backlog-analysis-agent": { 
    query: "Analyze claims backlog for Florida region and identify bottlenecks", 
    description: "Backlog queue analysis and throughput metrics" 
  },
  "adjuster-management-agent": { 
    query: "Show adjuster workload distribution and identify overloaded adjusters", 
    description: "Adjuster workload balancing and assignment optimization" 
  },
  "storm-assessment-agent": { 
    query: "Assess Hurricane Milton impact and estimate total losses for FL region", 
    description: "Storm impact analysis and loss estimation" 
  },
};

export default function Monitoring() {
  const { toast } = useToast();
  const [testingAgent, setTestingAgent] = useState<string | null>(null);

  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery<{
    agents: AgentStatus[];
    cache: CacheStats;
  }>({
    queryKey: ["/api/agent/status"],
    refetchInterval: 10000,
  });

  const { data: autonomyData, isLoading: autonomyLoading, refetch: refetchAutonomy } = useQuery<{
    autonomy: AutonomyStatus[];
  }>({
    queryKey: ["/api/agent/autonomy"],
    refetchInterval: 10000,
  });

  const { data: auditData, isLoading: auditLoading } = useQuery<{
    logs: AuditLog[];
  }>({
    queryKey: ["/api/agent/audit-logs"],
    refetchInterval: 30000,
  });

  const { data: connectionData, isLoading: connectionLoading, refetch: refetchConnection } = useQuery<ConnectionStatus>({
    queryKey: ["/api/agent/connection-status"],
    refetchInterval: 10000,
  });

  const promoteMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const res = await apiRequest("POST", `/api/agent/${agentId}/promote`);
      return res.json() as Promise<{ success: boolean; newLevel?: string; error?: string }>;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Agent Promoted",
          description: `Successfully promoted to ${data.newLevel}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/agent/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/agent/autonomy"] });
      } else {
        toast({
          title: "Promotion Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to promote agent",
        variant: "destructive",
      });
    },
  });

  const testAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const testConfig = AGENT_TEST_QUERIES[agentId];
      if (!testConfig) throw new Error("No test query for this agent");
      
      const res = await apiRequest("POST", "/api/agent/chat", {
        content: testConfig.query,
        conversationHistory: [],
      });
      return res.json() as Promise<{ response: string; agentId: string; action?: string }>;
    },
    onMutate: (agentId) => {
      setTestingAgent(agentId);
    },
    onSuccess: (data, agentId) => {
      toast({
        title: "Agent Test Successful",
        description: `${agentId} responded successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/audit-logs"] });
      setTestingAgent(null);
    },
    onError: (error, agentId) => {
      toast({
        title: "Agent Test Failed",
        description: error instanceof Error ? error.message : "Failed to test agent",
        variant: "destructive",
      });
      setTestingAgent(null);
    },
  });

  const resetDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/agent/reset");
      return res.json() as Promise<{ success: boolean; message: string }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Data Reset",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/autonomy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/audit-logs"] });
    },
    onError: () => {
      toast({
        title: "Reset Failed",
        description: "Failed to reset agent data",
        variant: "destructive",
      });
    },
  });

  const createTestActionsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/agent/test-actions");
      return res.json() as Promise<{ success: boolean; message: string }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Test Actions Created",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/audit-logs"] });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create test actions",
        variant: "destructive",
      });
    },
  });

  const setTrustLevelMutation = useMutation({
    mutationFn: async ({ agentId, level }: { agentId: string; level: string }) => {
      const res = await apiRequest("POST", `/api/agent/${agentId}/trust-level`, { level });
      return res.json() as Promise<{ success: boolean; error?: string }>;
    },
    onSuccess: (data, { agentId, level }) => {
      if (data.success) {
        toast({
          title: "Trust Level Updated",
          description: `${agentId} set to ${level}`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/agent/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/agent/autonomy"] });
        queryClient.invalidateQueries({ queryKey: ["/api/agent/connection-status"] });
      } else {
        toast({
          title: "Update Failed",
          description: data.error || "Failed to update trust level",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update trust level",
        variant: "destructive",
      });
    },
  });

  const agents = statusData?.agents || [];
  const cache = statusData?.cache;
  const autonomy = autonomyData?.autonomy || [];
  const logs = auditData?.logs || [];
  const connectedAgents = connectionData?.agents || [];
  const governance = connectionData?.governance;

  const totalDecisions = agents.reduce((sum, a) => sum + a.totalDecisions, 0);
  const avgSuccessRate = agents.length > 0
    ? agents.reduce((sum, a) => sum + a.successRate, 0) / agents.length
    : 0;
  const avgTrustScore = agents.length > 0
    ? agents.reduce((sum, a) => sum + a.trustScore, 0) / agents.length
    : 0;

  const handleRefresh = () => {
    refetchStatus();
    refetchAutonomy();
    toast({ title: "Refreshed", description: "Dashboard data updated" });
  };

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Agent Monitoring</h1>
            <p className="text-muted-foreground">
              Real-time metrics, trust levels, and autonomy progression
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              onClick={() => testAgentMutation.mutate("supervisor-main")} 
              variant="default"
              disabled={testingAgent !== null}
              data-testid="button-test-agent"
            >
              {testingAgent ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Test Agent
            </Button>
            <Button 
              onClick={() => createTestActionsMutation.mutate()} 
              variant="outline"
              disabled={createTestActionsMutation.isPending}
              data-testid="button-create-test-actions"
            >
              {createTestActionsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Create Test Actions
            </Button>
            <Button 
              onClick={() => resetDataMutation.mutate()} 
              variant="destructive"
              disabled={resetDataMutation.isPending}
              data-testid="button-reset-data"
            >
              {resetDataMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Reset All Data
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Decisions</CardTitle>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-decisions">
                {statusLoading ? "-" : totalDecisions.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Across all agents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-avg-success-rate">
                {statusLoading ? "-" : `${avgSuccessRate.toFixed(1)}%`}
              </div>
              <Progress value={avgSuccessRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Trust Score</CardTitle>
              <Shield className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-avg-trust-score">
                {statusLoading ? "-" : (avgTrustScore * 100).toFixed(0)}
              </div>
              <Progress value={avgTrustScore * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Status</CardTitle>
              <Database className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-cache-size">
                {cache ? `${cache.size}/${cache.maxEntries}` : "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                {cache ? `Hit rate: ${cache.hitRate.toFixed(1)}` : "Loading..."}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Governance Platform</CardTitle>
              <Shield className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {connectionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : connectionData?.governance.connected ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <span className="text-lg font-semibold text-green-600 dark:text-green-400" data-testid="text-governance-status">Online</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-lg font-semibold text-yellow-600 dark:text-yellow-400" data-testid="text-governance-status">Offline</span>
                    </>
                  )}
                </div>
                {!connectionData?.governance.connected && !connectionLoading && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => refetchConnection()}
                    disabled={connectionLoading}
                    data-testid="button-retry-connection"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {connectionData?.governance.provider || "Averecion"} 
                {connectionData?.governance.connected && ` (${connectionData.governance.latencyMs}ms)`}
                {connectionData?.governance.error && ` - ${connectionData.governance.error}`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Bot className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-agents">
                {connectionLoading ? "-" : (connectionData?.agents.filter(a => a.status === "active").length || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {connectionData?.agents.length || 0} registered with {connectionData?.governance.provider || "Averecion"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Agent Status
              </CardTitle>
              <CardDescription>Current trust levels and performance</CardDescription>
            </CardHeader>
            <CardContent>
              {statusLoading && connectionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : agents.length === 0 && connectedAgents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No agent metrics recorded yet
                </div>
              ) : (
                <div className="space-y-4">
                  {(agents.length > 0 ? agents : connectedAgents.map(ca => ({
                    agentId: ca.id,
                    type: ca.type,
                    trustLevel: ca.trustLevel,
                    trustScore: ca.trustScore,
                    totalDecisions: ca.totalDecisions,
                    successRate: ca.successRate,
                  }))).map((agent) => {
                    const testConfig = AGENT_TEST_QUERIES[agent.agentId];
                    const isTestingThis = testingAgent === agent.agentId;
                    
                    return (
                      <div
                        key={agent.agentId}
                        className="p-3 rounded-md bg-muted/50"
                        data-testid={`card-agent-${agent.agentId}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium truncate">{agent.agentId}</span>
                              <Select
                                value={agent.trustLevel}
                                onValueChange={(level) => setTrustLevelMutation.mutate({ agentId: agent.agentId, level })}
                              >
                                <SelectTrigger 
                                  className="w-[140px] h-7 text-xs"
                                  data-testid={`select-trust-level-${agent.agentId}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="supervised">Supervised</SelectItem>
                                  <SelectItem value="guided">Guided</SelectItem>
                                  <SelectItem value="semi_autonomous">Semi-Autonomous</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                              <span>{agent.totalDecisions} decisions</span>
                              <span>{agent.successRate.toFixed(1)}% success</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-lg font-semibold">
                                {(agent.trustScore * 100).toFixed(0)}
                              </div>
                              <div className="text-xs text-muted-foreground">Trust</div>
                            </div>
                            {testConfig && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => testAgentMutation.mutate(agent.agentId)}
                                disabled={testingAgent !== null}
                                data-testid={`button-test-${agent.agentId}`}
                              >
                                {isTestingThis ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        {testConfig && (
                          <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
                            <span className="font-medium">Test: </span>
                            {testConfig.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5" />
                Autonomy Progression
              </CardTitle>
              <CardDescription>Earned autonomy and promotion eligibility</CardDescription>
            </CardHeader>
            <CardContent>
              {autonomyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : autonomy.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No autonomy data available
                </div>
              ) : (
                <div className="space-y-4">
                  {autonomy.map((agent) => (
                    <div
                      key={agent.agentId}
                      className="p-3 rounded-md border"
                      data-testid={`card-autonomy-${agent.agentId}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <span className="font-medium">{agent.agentId}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={TRUST_LEVEL_COLORS[agent.currentLevel] || "secondary"}>
                            {TRUST_LEVEL_LABELS[agent.currentLevel] || agent.currentLevel}
                          </Badge>
                          {agent.nextLevel && (
                            <>
                              <span className="text-muted-foreground">→</span>
                              <Badge variant="outline">
                                {TRUST_LEVEL_LABELS[agent.nextLevel] || agent.nextLevel}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>

                      {agent.nextLevel && Object.entries(agent.progress).length > 0 && (
                        <div className="space-y-2 mt-3">
                          {Object.entries(agent.progress).map(([key, prog]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-24 capitalize">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                              </span>
                              <Progress
                                value={Math.min(100, (prog.current / prog.required) * 100)}
                                className="flex-1"
                              />
                              <span className="text-xs w-16 text-right">
                                {prog.current}/{prog.required}
                              </span>
                              {prog.met ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <Clock className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {agent.promotionEligible && agent.nextLevel && (
                        <Button
                          size="sm"
                          className="mt-3 w-full"
                          onClick={() => promoteMutation.mutate(agent.agentId)}
                          disabled={promoteMutation.isPending}
                          data-testid={`button-promote-${agent.agentId}`}
                        >
                          {promoteMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <ArrowUpCircle className="w-4 h-4 mr-2" />
                          )}
                          Promote to {TRUST_LEVEL_LABELS[agent.nextLevel] || agent.nextLevel}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest agent decisions and actions</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No activity recorded yet
              </div>
            ) : (
              <div className="space-y-2">
                {logs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-2 rounded-md hover-elevate"
                    data-testid={`row-audit-${log.id}`}
                  >
                    <div className="flex-shrink-0">
                      {log.decision === "executed" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : log.decision === "governance_rejected" ? (
                        <Shield className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{log.action}</span>
                        <Badge variant="outline" className="text-xs">
                          {log.agentId}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span>{log.latencyMs}ms</span>
                      <span>{(log.confidenceScore * 100).toFixed(0)}% conf</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
