import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Shield, AlertCircle, CheckCircle, Activity, ChevronRight } from "lucide-react";

interface AgentStatus {
  agents: Array<{ id: string; status: string }>;
  governance: {
    provider: string;
    configured: boolean;
    connected: boolean;
    latencyMs?: number;
    mode: string;
  };
}

interface ApprovalData {
  approvals: Array<{ id: number }>;
}

export function GovernanceBanner() {
  const { data: status } = useQuery<AgentStatus>({
    queryKey: ["/api/agent/connection-status"],
    refetchInterval: 30000,
  });

  const { data: approvals } = useQuery<ApprovalData>({
    queryKey: ["/api/agent/approvals"],
    refetchInterval: 30000,
  });

  const pendingCount = approvals?.approvals?.length || 0;
  const isConnected = status?.governance?.connected === true;
  const agentCount = status?.agents?.length || 0;

  return (
    <div className="border-b border-border bg-muted/30 px-4 py-2 shrink-0">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground hidden sm:inline">Governance:</span>
            {isConnected ? (
              <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
                <CheckCircle className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                <AlertCircle className="h-3 w-3" />
                Offline
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 text-sm">
            <Activity className="h-4 w-4 text-muted-foreground hidden sm:inline" />
            <Badge variant="secondary">
              {agentCount} agents
            </Badge>
          </div>

          {pendingCount > 0 && (
            <Link href="/approvals">
              <Badge 
                variant="destructive" 
                className="gap-1 cursor-pointer"
                data-testid="badge-pending-approvals"
              >
                <AlertCircle className="h-3 w-3" />
                {pendingCount} pending
              </Badge>
            </Link>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Link href="/monitoring">
            <Button variant="ghost" size="sm" className="text-xs gap-1" data-testid="link-monitoring">
              View Dashboard
              <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
