import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ShieldCheck, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ApprovalItem {
  id: number;
  correlationId: string;
  agentId: string;
  action: string;
  context: string;
  status: string;
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

interface AgentStatus {
  agentId: string;
  type: string;
  trustLevel: string;
  trustScore: number;
  totalDecisions: number;
  successRate: number;
}

function getActionBadgeVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  const highRisk = ["bulk_assign_claims", "approve_claim_payout"];
  const mediumRisk = ["triage_claim", "assign_adjuster", "update_claim_status"];
  
  if (highRisk.includes(action)) return "destructive";
  if (mediumRisk.includes(action)) return "secondary";
  return "outline";
}

function formatAction(action: string): string {
  return action
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function ApprovalCard({ approval, onApprove, onReject, isProcessing }: {
  approval: ApprovalItem;
  onApprove: (id: number, notes: string) => void;
  onReject: (id: number, notes: string) => void;
  isProcessing: boolean;
}) {
  const [notes, setNotes] = useState("");
  const context = JSON.parse(approval.context);

  return (
    <Card className="border-card-border" data-testid={`card-approval-${approval.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {formatAction(approval.action)}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}
            </CardDescription>
          </div>
          <Badge variant={getActionBadgeVariant(approval.action)}>
            {approval.action.includes("bulk_assign") || approval.action.includes("approve_claim") 
              ? "High Risk" 
              : "Medium Risk"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Agent</Label>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{approval.agentId}</span>
            <Badge variant="outline" className="text-xs">
              {context.trustLevel}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">User Query</Label>
          <div className="p-3 bg-muted/50 rounded-md text-sm">
            {context.userQuery}
          </div>
        </div>

        {context.payload && Object.keys(context.payload).length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Parameters</Label>
            <div className="p-3 bg-muted/50 rounded-md text-sm font-mono">
              {JSON.stringify(context.payload, null, 2)}
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <Label htmlFor={`notes-${approval.id}`} className="text-xs text-muted-foreground">
            Review Notes (optional)
          </Label>
          <Textarea
            id={`notes-${approval.id}`}
            placeholder="Add any notes about your decision..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none text-sm"
            rows={2}
            data-testid={`input-notes-${approval.id}`}
          />
        </div>
      </CardContent>

      <CardFooter className="gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onReject(approval.id, notes)}
          disabled={isProcessing}
          data-testid={`button-reject-${approval.id}`}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="h-4 w-4 mr-2" />
          )}
          Reject
        </Button>
        <Button
          className="flex-1"
          onClick={() => onApprove(approval.id, notes)}
          disabled={isProcessing}
          data-testid={`button-approve-${approval.id}`}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Approve
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function ApprovalsPage() {
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<number | null>(null);

  const { data: approvalsData, isLoading: approvalsLoading, refetch } = useQuery<{ approvals: ApprovalItem[] }>({
    queryKey: ["/api/agent/approvals"],
  });

  const { data: statusData } = useQuery<{ agents: AgentStatus[] }>({
    queryKey: ["/api/agent/status"],
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, decision, notes }: { id: number; decision: string; notes: string }) => {
      const response = await apiRequest("POST", `/api/agent/approvals/${id}`, {
        decision,
        reviewedBy: "current-user",
        reviewNotes: notes || null,
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.decision === "approved" ? "Action Approved" : "Action Rejected",
        description: `The agent action has been ${variables.decision}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/status"] });
      setProcessingId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process the approval. Please try again.",
        variant: "destructive",
      });
      setProcessingId(null);
    },
  });

  const handleApprove = (id: number, notes: string) => {
    setProcessingId(id);
    processMutation.mutate({ id, decision: "approved", notes });
  };

  const handleReject = (id: number, notes: string) => {
    setProcessingId(id);
    processMutation.mutate({ id, decision: "rejected", notes });
  };

  const approvals = approvalsData?.approvals || [];
  const agents = statusData?.agents || [];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6" data-testid="page-approvals">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-3">
              <ShieldCheck className="h-6 w-6" />
              Agent Approvals
            </h1>
            <p className="text-muted-foreground mt-1">
              Review and approve pending agent actions requiring human oversight
            </p>
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => refetch()}
            data-testid="button-refresh-approvals"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {agents.length > 0 && (
          <Card className="border-card-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Agent Status</CardTitle>
              <CardDescription>
                Current trust levels and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {agents.map((agent) => (
                  <div 
                    key={agent.agentId} 
                    className="p-3 rounded-md bg-muted/50 space-y-2"
                    data-testid={`status-agent-${agent.agentId}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{agent.type}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {agent.trustLevel}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{agent.totalDecisions} decisions</span>
                      <span>{agent.successRate.toFixed(0)}% success</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium">Pending Approvals</h2>
            <Badge variant="secondary" data-testid="badge-pending-count">
              {approvals.length} pending
            </Badge>
          </div>

          {approvalsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : approvals.length === 0 ? (
            <Card className="border-card-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium">All caught up!</h3>
                <p className="text-muted-foreground mt-1">
                  No pending approvals at this time
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {approvals.map((approval) => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isProcessing={processingId === approval.id}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
