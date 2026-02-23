import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsPanel } from "@/components/notifications-panel";
import { Footer } from "@/components/footer";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import DashboardPage from "@/pages/dashboard";
import BacklogPage from "@/pages/backlog";
import AdjustersPage from "@/pages/adjusters";
import TriagePage from "@/pages/triage";
import SettingsPage from "@/pages/settings";
import HelpPage from "@/pages/help";
import ApprovalsPage from "@/pages/approvals";
import DataSourcesPage from "@/pages/data-sources";
import MonitoringPage from "@/pages/monitoring";
import AgentStatusPage from "@/pages/agent-status";
import AgentActionsPage from "@/pages/agent-actions";
import LegalPage from "@/pages/legal";
import PrivacyPage from "@/pages/privacy";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/backlog" component={BacklogPage} />
      <Route path="/adjusters" component={AdjustersPage} />
      <Route path="/triage" component={TriagePage} />
      <Route path="/triage/:claimId" component={TriagePage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/approvals" component={ApprovalsPage} />
      <Route path="/data-sources" component={DataSourcesPage} />
      <Route path="/monitoring" component={MonitoringPage} />
      <Route path="/agent-status" component={AgentStatusPage} />
      <Route path="/agent-actions" component={AgentActionsPage} />
      <Route path="/legal" component={LegalPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center justify-between gap-4 px-4 py-2 border-b border-border bg-background sticky top-0 z-50">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex items-center gap-1">
                  <NotificationsPanel />
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto">
                <Router />
              </main>
              <Footer />
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
