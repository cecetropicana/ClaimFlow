import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Check,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AgentAlert {
  id: number;
  agentId: string;
  alertType: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  relatedAssetId: string | null;
  relatedAssetType: string | null;
  createdAt: string;
  acknowledgedAt: string | null;
}

function severityIcon(severity: string) {
  switch (severity) {
    case "critical":
    case "high":
      return <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />;
    case "medium":
      return <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />;
    case "low":
      return <Info className="h-4 w-4 text-muted-foreground shrink-0" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function severityBadgeVariant(severity: string) {
  switch (severity) {
    case "critical":
      return "destructive" as const;
    case "high":
      return "destructive" as const;
    case "medium":
      return "default" as const;
    default:
      return "secondary" as const;
  }
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);

  const { data: alerts = [] } = useQuery<AgentAlert[]>({
    queryKey: ["/api/agent/actions/alerts"],
    refetchInterval: 30000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: number) =>
      apiRequest("POST", `/api/agent/actions/alerts/${alertId}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/agent/actions/alerts"],
      });
    },
  });

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const recentAlerts = alerts.slice(0, 20);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-4 w-4" />
          {activeAlerts.length > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1"
              data-testid="badge-notification-count"
            >
              {activeAlerts.length > 99 ? "99+" : activeAlerts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        data-testid="panel-notifications"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <h3 className="text-sm font-semibold">Alerts</h3>
          {activeAlerts.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeAlerts.length} active
            </Badge>
          )}
        </div>
        <Separator />
        <div className="max-h-80 overflow-y-auto">
          {recentAlerts.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No alerts at this time
              </p>
            </div>
          ) : (
            recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`px-4 py-3 border-b border-border last:border-0 ${
                  alert.status === "active"
                    ? "bg-muted/30"
                    : ""
                }`}
                data-testid={`notification-${alert.id}`}
              >
                <div className="flex items-start gap-3">
                  {severityIcon(alert.severity)}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium leading-tight">
                        {alert.title}
                      </p>
                      <Badge
                        variant={severityBadgeVariant(alert.severity)}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {timeAgo(alert.createdAt)}
                      </span>
                      {alert.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            acknowledgeMutation.mutate(alert.id);
                          }}
                          disabled={acknowledgeMutation.isPending}
                          data-testid={`button-ack-${alert.id}`}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                      {alert.status === "acknowledged" && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
