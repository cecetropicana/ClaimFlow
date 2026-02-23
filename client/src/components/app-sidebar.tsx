import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { 
  MessageSquare, 
  LayoutDashboard,
  ListTodo,
  Users,
  FileSearch,
  Settings,
  HelpCircle,
  ShieldCheck,
  Database,
  Activity,
  Bot,
  PlayCircle,
  Shield
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import type { DashboardMetrics } from "@shared/schema";

const claimsItems = [
  {
    title: "Chat",
    url: "/",
    icon: MessageSquare,
    description: "AI claims assistant"
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    description: "Claims overview & metrics"
  },
  {
    title: "Backlog Queue",
    url: "/backlog",
    icon: ListTodo,
    description: "Manage claims backlog"
  },
  {
    title: "Adjusters",
    url: "/adjusters",
    icon: Users,
    description: "Adjuster workload"
  },
  {
    title: "Claim Triage",
    url: "/triage",
    icon: FileSearch,
    description: "Review & classify claims"
  },
];

const supportItems = [
  {
    title: "Data Sources",
    url: "/data-sources",
    icon: Database,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Help & Docs",
    url: "/help",
    icon: HelpCircle,
  },
];

const governanceItems = [
  {
    title: "Agent Status",
    url: "/agent-status",
    icon: Bot,
    description: "Connection status and overview"
  },
  {
    title: "Agent Actions",
    url: "/agent-actions",
    icon: PlayCircle,
    description: "View actions taken by agents"
  },
  {
    title: "Agent Approvals",
    url: "/approvals",
    icon: ShieldCheck,
    description: "Review pending actions"
  },
  {
    title: "Monitoring",
    url: "/monitoring",
    icon: Activity,
    description: "Agent metrics and autonomy"
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  
  const { data: approvalsData } = useQuery<{ approvals: Array<{ id: number }> }>({
    queryKey: ["/api/agent/approvals"],
    refetchInterval: 30000,
  });

  const { data: metricsData } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    refetchInterval: 60000,
  });
  
  const pendingCount = approvalsData?.approvals?.length || 0;
  const unassignedCount = metricsData?.unassignedClaims || 0;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">ClaimFlow</h1>
            <p className="text-xs text-muted-foreground">Storm Claims Manager</p>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Claims Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {claimsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                    tooltip={item.description}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.title === "Backlog Queue" && unassignedCount > 0 && (
                        <Badge variant="destructive" className="ml-auto text-xs">
                          {unassignedCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Governance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {governanceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                    tooltip={item.description}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {item.title === "Agent Approvals" && pendingCount > 0 && (
                        <Badge variant="destructive" className="ml-auto text-xs">
                          {pendingCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="p-3 rounded-lg bg-muted/50 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Preview</Badge>
            <span className="text-xs text-muted-foreground">v2.0.0</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by OpenAI
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
