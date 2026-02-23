import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Database, 
  Map, 
  Activity, 
  AlertTriangle, 
  Gauge, 
  Zap, 
  Cloud, 
  Upload,
  Plus,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Settings
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DataSource {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  status: "connected" | "disconnected" | "error" | "syncing";
  connectionConfig: Record<string, unknown>;
  refreshIntervalMinutes?: number;
  lastSyncAt?: string;
}

interface DataSourceSchema {
  displayName: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  icon: string;
}

const iconMap: Record<string, any> = {
  Map,
  Activity,
  AlertTriangle,
  Database,
  Gauge,
  Zap,
  Cloud,
  Upload,
};

function getStatusBadge(status: string) {
  switch (status) {
    case "connected":
      return <Badge variant="default" className="bg-green-600 dark:bg-green-700">Connected</Badge>;
    case "syncing":
      return <Badge variant="secondary">Syncing</Badge>;
    case "error":
      return <Badge variant="destructive">Error</Badge>;
    default:
      return <Badge variant="outline">Disconnected</Badge>;
  }
}

export default function DataSourcesPage() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceConfig, setNewSourceConfig] = useState<Record<string, string>>({});

  const { data, isLoading, refetch } = useQuery<{ sources: DataSource[]; schema: Record<string, DataSourceSchema> }>({
    queryKey: ["/api/data-sources"],
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/data-sources/${id}/test`, {});
      return response.json();
    },
    onSuccess: (result, id) => {
      toast({
        title: result.success ? "Connection Successful" : "Connection Failed",
        description: result.success 
          ? "Data source is reachable" 
          : result.error || "Could not connect to data source",
        variant: result.success ? "default" : "destructive",
      });
    },
  });

  const addMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await apiRequest("POST", "/api/data-sources", config);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Data Source Added", description: "Configuration saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      setSelectedType(null);
      setNewSourceName("");
      setNewSourceConfig({});
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add data source", variant: "destructive" });
    },
  });

  const sources = data?.sources || [];
  const schema = data?.schema || {};

  const handleAddSource = () => {
    if (!selectedType || !newSourceName) return;
    
    addMutation.mutate({
      id: `${selectedType}-${Date.now()}`,
      name: newSourceName,
      type: selectedType,
      connectionConfig: newSourceConfig,
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6" data-testid="page-data-sources">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-3">
              <Database className="h-6 w-6" />
              Data Sources
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect to claims, policy, and adjuster data systems for real-time analysis
            </p>
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => refetch()}
            data-testid="button-refresh-sources"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <Card className="border-card-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Data Source
            </CardTitle>
            <CardDescription>
              Connect to your claims management data systems
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select value={selectedType || ""} onValueChange={setSelectedType}>
                  <SelectTrigger data-testid="select-source-type">
                    <SelectValue placeholder="Select data source type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(schema).map(([type, info]) => {
                      const Icon = iconMap[info.icon] || Database;
                      return (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {info.displayName}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  placeholder="My Claims Database"
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  data-testid="input-source-name"
                />
              </div>
            </div>

            {selectedType && schema[selectedType] && (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">{schema[selectedType].description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {schema[selectedType].requiredFields.map((field) => (
                    <div key={field} className="space-y-2">
                      <Label>{field} *</Label>
                      <Input
                        placeholder={`Enter ${field}`}
                        value={newSourceConfig[field] || ""}
                        onChange={(e) => setNewSourceConfig(prev => ({ ...prev, [field]: e.target.value }))}
                        data-testid={`input-${field}`}
                      />
                    </div>
                  ))}
                  {schema[selectedType].optionalFields.map((field) => (
                    <div key={field} className="space-y-2">
                      <Label className="text-muted-foreground">{field}</Label>
                      <Input
                        placeholder={`Enter ${field} (optional)`}
                        value={newSourceConfig[field] || ""}
                        onChange={(e) => setNewSourceConfig(prev => ({ ...prev, [field]: e.target.value }))}
                        data-testid={`input-${field}`}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleAddSource}
              disabled={!selectedType || !newSourceName || addMutation.isPending}
              data-testid="button-add-source"
            >
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Data Source
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-medium">Configured Sources</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sources.length === 0 ? (
            <Card className="border-card-border">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Database className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Data Sources Configured</h3>
                <p className="text-muted-foreground mt-1">
                  Add a data source above to connect to your utility systems
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sources.map((source) => {
                const schemaInfo = schema[source.type];
                const Icon = schemaInfo ? iconMap[schemaInfo.icon] : Database;
                
                return (
                  <Card key={source.id} className="border-card-border" data-testid={`card-source-${source.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-muted">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{source.name}</CardTitle>
                            <CardDescription>
                              {schemaInfo?.displayName || source.type}
                            </CardDescription>
                          </div>
                        </div>
                        {getStatusBadge(source.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Settings className="h-3 w-3" />
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {JSON.stringify(source.connectionConfig).slice(0, 60)}...
                        </code>
                      </div>
                    </CardContent>
                    <CardFooter className="gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testMutation.mutate(source.id)}
                        disabled={testMutation.isPending}
                        data-testid={`button-test-${source.id}`}
                      >
                        {testMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Test Connection
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Card className="border-card-border bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base">Integration Guide</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium">Claims Management System</h4>
              <p className="text-muted-foreground">
                Connect to the claims management platform to access claim records, policy data, and adjuster assignments.
                Requires the base URL and API credentials.
              </p>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium">Weather & Storm Tracking</h4>
              <p className="text-muted-foreground">
                Connect to weather services for real-time storm tracking, severe weather alerts,
                and historical weather data for claims correlation.
              </p>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium">Catastrophe Models</h4>
              <p className="text-muted-foreground">
                Integrate with CAT modeling platforms for loss estimation, exposure analysis,
                and risk assessment across storm events.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
