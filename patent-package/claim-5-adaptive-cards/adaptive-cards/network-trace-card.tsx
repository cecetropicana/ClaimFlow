import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Network, 
  ArrowUp, 
  ArrowDown, 
  Users,
  Ruler,
  Layers,
  AlertCircle,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import type { NetworkTrace } from "@shared/schema";
import { MockDataBanner } from "@/components/mock-data-banner";

interface NetworkTraceCardProps {
  data: NetworkTrace;
  isMockData?: boolean;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "FAULT":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "WARNING":
      return <AlertTriangle className="h-4 w-4 text-chart-4" />;
    default:
      return <CheckCircle2 className="h-4 w-4 text-chart-2" />;
  }
}

function getStatusBadgeVariant(status: string): "destructive" | "default" | "secondary" | "outline" {
  switch (status) {
    case "FAULT":
      return "destructive";
    case "WARNING":
      return "default";
    default:
      return "outline";
  }
}

export function NetworkTraceCard({ data, isMockData = false }: NetworkTraceCardProps) {
  const DirectionIcon = data.traceDirection === "upstream" ? ArrowUp : ArrowDown;

  return (
    <Card className="w-full max-w-3xl border-card-border" data-testid="card-network-trace">
      {isMockData && (
        <div className="px-6 pt-4">
          <MockDataBanner />
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-3/10">
              <Network className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Network Trace Results</h3>
              <p className="text-sm text-muted-foreground">
                {data.assetType}: {data.assetId}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            <DirectionIcon className="h-3 w-3 mr-1" />
            {data.traceDirection.charAt(0).toUpperCase() + data.traceDirection.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1 text-center p-4 rounded-lg bg-muted/50">
            <Layers className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-2xl font-bold" data-testid="text-total-elements">
              {data.summary.totalElements}
            </p>
            <p className="text-xs text-muted-foreground">Elements</p>
          </div>
          <div className="space-y-1 text-center p-4 rounded-lg bg-muted/50">
            <Users className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-2xl font-bold" data-testid="text-total-customers">
              {data.summary.totalCustomers.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Customers</p>
          </div>
          <div className="space-y-1 text-center p-4 rounded-lg bg-muted/50">
            <Ruler className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-2xl font-bold" data-testid="text-total-distance">
              {data.summary.totalDistanceMiles.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Miles</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold">Trace Path</h4>
          
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-3">
              {data.traceElements.map((element, idx) => (
                <div 
                  key={element.elementId}
                  className="relative pl-10 pr-4 py-3"
                  data-testid={`trace-element-${element.elementId}`}
                >
                  <div className="absolute left-2 top-4 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  
                  <div className="p-4 border border-border rounded-lg hover-elevate">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{element.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {element.elementType}
                          </Badge>
                          <Badge variant={getStatusBadgeVariant(element.status)} className="text-xs">
                            {getStatusIcon(element.status)}
                            <span className="ml-1">{element.status}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {element.elementId}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">{element.distance.toFixed(2)} mi</p>
                        {element.customersDownstream !== undefined && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {element.customersDownstream.toLocaleString()} customers
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="outline" size="sm" data-testid="button-trace-opposite">
            <DirectionIcon className="h-4 w-4 mr-2 rotate-180" />
            Trace {data.traceDirection === "upstream" ? "Downstream" : "Upstream"}
          </Button>
          <Button variant="outline" size="sm" data-testid="button-view-map">
            View on Map
          </Button>
          <Button variant="outline" size="sm" data-testid="button-export-trace">
            Export Trace Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
