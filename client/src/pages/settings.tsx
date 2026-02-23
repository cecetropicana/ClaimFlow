import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings, Bell, Shield, Database, Globe, AlertTriangle, CheckCircle2, Loader2, FlaskConical } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AppSettings {
  useMockData: boolean;
}

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: settings, isLoading: settingsLoading } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (useMockData: boolean) => {
      const res = await apiRequest("PATCH", "/api/settings", { useMockData });
      return res.json() as Promise<AppSettings>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: data.useMockData ? "Sample Data Enabled" : "Sample Data Disabled",
        description: data.useMockData 
          ? "Analysis results will show demonstration data." 
          : "Analysis will use connected data sources.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6" data-testid="page-settings">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-3">
            <Settings className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your ClaimFlow preferences
          </p>
        </div>

        <Card className="border-card-border border-2 border-amber-300 dark:border-amber-700">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Data Mode
            </CardTitle>
            <CardDescription>
              Control whether the application uses sample demonstration data or connected data sources
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Use Sample Data</Label>
                <p className="text-sm text-muted-foreground">
                  Show demonstration data with a "Sample Data" banner on analysis results
                </p>
              </div>
              {settingsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch 
                  checked={settings?.useMockData ?? true}
                  onCheckedChange={(checked) => updateSettingsMutation.mutate(checked)}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="switch-mock-data" 
                />
              )}
            </div>
            
            {settings?.useMockData && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Sample Data Mode Active</p>
                  <p className="text-xs opacity-90">
                    All analysis results are for demonstration. Connect data sources and disable this setting for real analysis.
                  </p>
                </div>
              </div>
            )}
            
            {!settings?.useMockData && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Live Data Mode</p>
                  <p className="text-xs opacity-90">
                    Analysis will use connected data sources. Configure sources in the Data Sources page.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how you receive alerts and updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive analysis results via email
                </p>
              </div>
              <Switch data-testid="switch-email-notifications" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Storm Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about severe weather events
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-storm-alerts" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Backlog Warnings</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when unassigned claims exceed thresholds
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-capacity-warnings" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Sources
            </CardTitle>
            <CardDescription>
              Configure API endpoints and data connections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="claims-api">Claims Management API</Label>
              <Input 
                id="claims-api"
                placeholder="https://claims.example.com/api"
                defaultValue="https://claims.insurer.com/api"
                data-testid="input-claims-api"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-api">Policy System API</Label>
              <Input 
                id="policy-api"
                placeholder="https://policy.example.com"
                defaultValue="https://policy.insurer.com/api"
                data-testid="input-policy-api"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weather-api">Weather Service API</Label>
              <Input 
                id="weather-api"
                placeholder="https://weather.example.com"
                defaultValue="https://api.weather.gov"
                data-testid="input-weather-api"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </CardTitle>
            <CardDescription>
              Authentication and access settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security
                </p>
              </div>
              <Switch data-testid="switch-2fa" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Session Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Auto-logout after 30 minutes of inactivity
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-session-timeout" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Regional Settings
            </CardTitle>
            <CardDescription>
              Default region and localization preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-region">Default Region</Label>
              <Input 
                id="default-region"
                placeholder="GA"
                defaultValue="GA"
                data-testid="input-default-region"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input 
                id="timezone"
                placeholder="America/New_York"
                defaultValue="America/New_York"
                data-testid="input-timezone"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" data-testid="button-cancel">
            Cancel
          </Button>
          <Button data-testid="button-save-settings">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
