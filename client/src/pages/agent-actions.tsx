import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  Calendar, 
  FileText, 
  RefreshCw,
  Bell,
  Activity,
  CheckCircle2,
  Clock,
  Wrench,
  Server,
  Loader2,
  XCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";

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
  resolvedAt: string | null;
}

interface ScheduledMaintenance {
  id: number;
  agentId: string;
  title: string;
  description: string | null;
  assetId: string;
  assetType: string;
  assetName: string | null;
  maintenanceType: string;
  priority: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  estimatedCustomersAffected: number | null;
  createdAt: string;
}

interface WorkOrder {
  id: number;
  agentId: string;
  workOrderNumber: string;
  title: string;
  description: string | null;
  workType: string;
  priority: string;
  status: string;
  assetId: string | null;
  assetType: string | null;
  assignedTeam: string | null;
  estimatedHours: number | null;
  dueDate: string | null;
  createdAt: string;
}

interface AssetStatusUpdate {
  id: number;
  agentId: string;
  assetId: string;
  assetType: string;
  assetName: string | null;
  previousStatus: string | null;
  newStatus: string;
  reason: string | null;
  needsInspection: boolean | null;
  createdAt: string;
}

interface EventLogEntry {
  id: number;
  agentId: string;
  eventType: string;
  category: string;
  title: string;
  description: string | null;
  severity: string;
  relatedAssetId: string | null;
  createdAt: string;
}

interface Notification {
  id: number;
  agentId: string;
  notificationType: string;
  recipient: string;
  subject: string | null;
  message: string;
  priority: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
}

function getSeverityBadgeVariant(severity: string): "default" | "secondary" | "destructive" | "outline" {
  switch (severity) {
    case "critical": return "destructive";
    case "high": return "destructive";
    case "medium": return "secondary";
    case "warning": return "secondary";
    default: return "outline";
  }
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active": return "destructive";
    case "acknowledged": return "secondary";
    case "resolved": return "outline";
    case "open": return "destructive";
    case "in_progress": return "secondary";
    case "completed": return "outline";
    case "cancelled": return "outline";
    case "scheduled": return "default";
    default: return "outline";
  }
}

function getPriorityBadgeVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
  switch (priority) {
    case "urgent": return "destructive";
    case "high": return "destructive";
    case "normal": return "secondary";
    default: return "outline";
  }
}

function AlertCard({ alert, onAcknowledge, onResolve, isProcessing }: {
  alert: AgentAlert;
  onAcknowledge: (id: number) => void;
  onResolve: (id: number) => void;
  isProcessing: boolean;
}) {
  return (
    <Card className="border-card-border" data-testid={`card-alert-${alert.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-base truncate">{alert.title}</CardTitle>
            <CardDescription className="text-xs">
              {alert.agentId} - {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant={getSeverityBadgeVariant(alert.severity)} data-testid={`badge-severity-${alert.id}`}>
              {alert.severity}
            </Badge>
            <Badge variant={getStatusBadgeVariant(alert.status)} data-testid={`badge-status-${alert.id}`}>
              {alert.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{alert.message}</p>
        {alert.relatedAssetId && (
          <div className="text-xs text-muted-foreground">
            Asset: {alert.relatedAssetType} - {alert.relatedAssetId}
          </div>
        )}
        {alert.status === "active" && (
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAcknowledge(alert.id)}
              disabled={isProcessing}
              data-testid={`button-acknowledge-${alert.id}`}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Acknowledge
            </Button>
            <Button 
              size="sm"
              onClick={() => onResolve(alert.id)}
              disabled={isProcessing}
              data-testid={`button-resolve-${alert.id}`}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
              Resolve
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MaintenanceCard({ maintenance }: { maintenance: ScheduledMaintenance }) {
  return (
    <Card className="border-card-border" data-testid={`card-maintenance-${maintenance.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-base truncate">{maintenance.title}</CardTitle>
            <CardDescription className="text-xs">
              {maintenance.agentId} - {maintenance.maintenanceType}
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant={getPriorityBadgeVariant(maintenance.priority)} data-testid={`badge-priority-${maintenance.id}`}>
              {maintenance.priority}
            </Badge>
            <Badge variant={getStatusBadgeVariant(maintenance.status)} data-testid={`badge-status-${maintenance.id}`}>
              {maintenance.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {maintenance.description && (
          <p className="text-sm text-muted-foreground">{maintenance.description}</p>
        )}
        <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(maintenance.scheduledStart), "MMM d, h:mm a")} - {format(new Date(maintenance.scheduledEnd), "h:mm a")}
          </span>
          <span className="flex items-center gap-1">
            <Server className="h-3 w-3" />
            {maintenance.assetType}: {maintenance.assetName || maintenance.assetId}
          </span>
        </div>
        {maintenance.estimatedCustomersAffected && (
          <div className="text-xs text-muted-foreground">
            Est. customers affected: {maintenance.estimatedCustomersAffected.toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkOrderCard({ workOrder }: { workOrder: WorkOrder }) {
  return (
    <Card className="border-card-border" data-testid={`card-workorder-${workOrder.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-base truncate">
              <span className="font-mono text-xs text-muted-foreground mr-2">{workOrder.workOrderNumber}</span>
              {workOrder.title}
            </CardTitle>
            <CardDescription className="text-xs">
              {workOrder.workType} - {workOrder.agentId}
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant={getPriorityBadgeVariant(workOrder.priority)} data-testid={`badge-priority-${workOrder.id}`}>
              {workOrder.priority}
            </Badge>
            <Badge variant={getStatusBadgeVariant(workOrder.status)} data-testid={`badge-status-${workOrder.id}`}>
              {workOrder.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {workOrder.description && (
          <p className="text-sm text-muted-foreground">{workOrder.description}</p>
        )}
        <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
          {workOrder.assignedTeam && (
            <span>Team: {workOrder.assignedTeam}</span>
          )}
          {workOrder.estimatedHours && (
            <span>Est. hours: {workOrder.estimatedHours}</span>
          )}
          {workOrder.dueDate && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Due: {format(new Date(workOrder.dueDate), "MMM d")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AssetUpdateCard({ update }: { update: AssetStatusUpdate }) {
  return (
    <Card className="border-card-border" data-testid={`card-asset-${update.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-base truncate">
              {update.assetName || update.assetId}
            </CardTitle>
            <CardDescription className="text-xs">
              {update.assetType} - {update.agentId}
            </CardDescription>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {update.previousStatus && (
              <>
                <Badge variant="outline">{update.previousStatus}</Badge>
                <span className="text-xs text-muted-foreground">to</span>
              </>
            )}
            <Badge variant="default">{update.newStatus}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {update.reason && (
          <p className="text-sm text-muted-foreground">{update.reason}</p>
        )}
        <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
          {update.needsInspection && (
            <Badge variant="secondary" className="text-xs">Needs Inspection</Badge>
          )}
          <span>{formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function EventCard({ event }: { event: EventLogEntry }) {
  return (
    <Card className="border-card-border" data-testid={`card-event-${event.id}`}>
      <CardHeader className="py-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-sm">{event.title}</CardTitle>
            <CardDescription className="text-xs">
              {event.category} / {event.eventType} - {event.agentId}
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant={getSeverityBadgeVariant(event.severity)}>{event.severity}</Badge>
          </div>
        </div>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-2">{event.description}</p>
        )}
        <div className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
        </div>
      </CardHeader>
    </Card>
  );
}

function NotificationCard({ notification }: { notification: Notification }) {
  return (
    <Card className="border-card-border" data-testid={`card-notification-${notification.id}`}>
      <CardHeader className="py-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-sm">{notification.subject || "Notification"}</CardTitle>
            <CardDescription className="text-xs">
              To: {notification.recipient} - {notification.notificationType}
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant={getPriorityBadgeVariant(notification.priority)}>{notification.priority}</Badge>
            <Badge variant={notification.status === "sent" ? "outline" : "secondary"}>{notification.status}</Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{notification.message}</p>
        <div className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </div>
      </CardHeader>
    </Card>
  );
}

export default function AgentActionsPage() {
  const { toast } = useToast();

  const { data: alerts = [], isLoading: alertsLoading, refetch: refetchAlerts } = useQuery<AgentAlert[]>({
    queryKey: ["/api/agent/actions/alerts"],
  });

  const { data: maintenance = [], isLoading: maintenanceLoading, refetch: refetchMaintenance } = useQuery<ScheduledMaintenance[]>({
    queryKey: ["/api/agent/actions/maintenance"],
  });

  const { data: workOrders = [], isLoading: workOrdersLoading, refetch: refetchWorkOrders } = useQuery<WorkOrder[]>({
    queryKey: ["/api/agent/actions/work-orders"],
  });

  const { data: assetUpdates = [], isLoading: assetsLoading, refetch: refetchAssets } = useQuery<AssetStatusUpdate[]>({
    queryKey: ["/api/agent/actions/asset-updates"],
  });

  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery<EventLogEntry[]>({
    queryKey: ["/api/agent/actions/events"],
  });

  const { data: notifications = [], isLoading: notificationsLoading, refetch: refetchNotifications } = useQuery<Notification[]>({
    queryKey: ["/api/agent/actions/notifications"],
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest("POST", `/api/agent/actions/alerts/${alertId}/acknowledge`, {});
    },
    onSuccess: () => {
      toast({ title: "Alert acknowledged" });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/actions/alerts"] });
    },
    onError: () => {
      toast({ title: "Failed to acknowledge alert", variant: "destructive" });
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest("POST", `/api/agent/actions/alerts/${alertId}/resolve`, {});
    },
    onSuccess: () => {
      toast({ title: "Alert resolved" });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/actions/alerts"] });
    },
    onError: () => {
      toast({ title: "Failed to resolve alert", variant: "destructive" });
    }
  });

  const refreshAll = () => {
    refetchAlerts();
    refetchMaintenance();
    refetchWorkOrders();
    refetchAssets();
    refetchEvents();
    refetchNotifications();
  };

  const activeAlerts = alerts.filter(a => a.status === "active").length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Agent Actions</h1>
          <p className="text-sm text-muted-foreground">View actions taken by AI agents</p>
        </div>
        <Button variant="outline" onClick={refreshAll} data-testid="button-refresh">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <Tabs defaultValue="alerts" className="h-full flex flex-col">
          <TabsList className="flex-wrap h-auto gap-1 mb-4" data-testid="tabs-actions">
            <TabsTrigger value="alerts" className="flex items-center gap-2" data-testid="tab-alerts">
              <AlertTriangle className="h-4 w-4" />
              Alerts
              {activeAlerts > 0 && (
                <Badge variant="destructive" className="ml-1">{activeAlerts}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2" data-testid="tab-maintenance">
              <Calendar className="h-4 w-4" />
              Maintenance ({maintenance.length})
            </TabsTrigger>
            <TabsTrigger value="work-orders" className="flex items-center gap-2" data-testid="tab-work-orders">
              <Wrench className="h-4 w-4" />
              Work Orders ({workOrders.length})
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-2" data-testid="tab-assets">
              <Server className="h-4 w-4" />
              Asset Updates ({assetUpdates.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2" data-testid="tab-events">
              <Activity className="h-4 w-4" />
              Events ({events.length})
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2" data-testid="tab-notifications">
              <Bell className="h-4 w-4" />
              Notifications ({notifications.length})
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="alerts" className="h-full m-0">
              <ScrollArea className="h-full">
                {alertsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No alerts yet</p>
                    <p className="text-sm">Agents will create alerts when issues are detected</p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {alerts.map(alert => (
                      <AlertCard 
                        key={alert.id} 
                        alert={alert}
                        onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
                        onResolve={(id) => resolveMutation.mutate(id)}
                        isProcessing={acknowledgeMutation.isPending || resolveMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="maintenance" className="h-full m-0">
              <ScrollArea className="h-full">
                {maintenanceLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : maintenance.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No scheduled maintenance</p>
                    <p className="text-sm">Agents will schedule maintenance when needed</p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {maintenance.map(m => (
                      <MaintenanceCard key={m.id} maintenance={m} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="work-orders" className="h-full m-0">
              <ScrollArea className="h-full">
                {workOrdersLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : workOrders.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No work orders</p>
                    <p className="text-sm">Agents will create work orders for field teams</p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {workOrders.map(wo => (
                      <WorkOrderCard key={wo.id} workOrder={wo} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="assets" className="h-full m-0">
              <ScrollArea className="h-full">
                {assetsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : assetUpdates.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No asset updates</p>
                    <p className="text-sm">Agents will update asset status when changes occur</p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {assetUpdates.map(update => (
                      <AssetUpdateCard key={update.id} update={update} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="events" className="h-full m-0">
              <ScrollArea className="h-full">
                {eventsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No events logged</p>
                    <p className="text-sm">Agents will log events as they process queries</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-4">
                    {events.map(event => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="notifications" className="h-full m-0">
              <ScrollArea className="h-full">
                {notificationsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No notifications sent</p>
                    <p className="text-sm">Agents will send notifications for important events</p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-4">
                    {notifications.map(notification => (
                      <NotificationCard key={notification.id} notification={notification} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
