import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  Zap, 
  AlertTriangle, 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Download,
  BarChart3
} from "lucide-react";
import type { DataCenterImpact } from "@shared/schema";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MockDataBanner } from "@/components/mock-data-banner";

interface DataCenterImpactCardProps {
  data: DataCenterImpact;
  isMockData?: boolean;
}

function getRiskBadgeVariant(risk: string): "destructive" | "default" | "secondary" | "outline" {
  switch (risk) {
    case "CRITICAL":
      return "destructive";
    case "HIGH":
      return "default";
    case "MEDIUM":
      return "secondary";
    default:
      return "outline";
  }
}

function formatNumber(num: number, decimals: number = 1): string {
  return num.toFixed(decimals);
}

export function DataCenterImpactCard({ data, isMockData = false }: DataCenterImpactCardProps) {
  const [expandedSubstations, setExpandedSubstations] = useState<Set<string>>(new Set());

  const toggleSubstation = (id: string) => {
    setExpandedSubstations(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Card className="w-full max-w-3xl border-card-border" data-testid="card-datacenter-impact">
      {isMockData && (
        <div className="px-6 pt-4">
          <MockDataBanner />
        </div>
      )}
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Data Center Impact Analysis</h3>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>Region: <span className="font-medium text-foreground">{data.summary.region}</span></span>
            <span>Time Horizon: <span className="font-medium text-foreground">10 Years</span></span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{data.summary.analysisDate}</span>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data Centers</p>
            <p className="text-3xl font-bold" data-testid="text-total-datacenters">{data.summary.totalDataCenters}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Substations</p>
            <p className="text-3xl font-bold" data-testid="text-total-substations">{data.summary.totalSubstationsAnalyzed}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Need Upgrade</p>
            <p className="text-3xl font-bold text-destructive" data-testid="text-needing-upgrade">{data.summary.substationsNeedingUpgrade}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pipeline MW</p>
            <p className="text-3xl font-bold" data-testid="text-pipeline-mw">{data.summary.totalDcCapacityMw}</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-chart-4" />
            <span className="font-medium">Estimated Investment Required</span>
          </div>
          <span className="text-xl font-bold" data-testid="text-investment">
            ${formatNumber(data.summary.estimatedTotalInvestmentMillions, 1)}M
          </span>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold">Top 5 Impacted Substations</h4>
          
          <div className="space-y-3">
            {data.topImpactedSubstations.slice(0, 5).map((sub) => (
              <Collapsible 
                key={sub.substationId}
                open={expandedSubstations.has(sub.substationId)}
                onOpenChange={() => toggleSubstation(sub.substationId)}
              >
                <div className="border border-border rounded-lg overflow-visible">
                  <CollapsibleTrigger asChild>
                    <button 
                      className="w-full p-4 text-left hover-elevate active-elevate-2 rounded-lg transition-colors"
                      data-testid={`button-substation-${sub.substationId}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold truncate">{sub.substationName}</span>
                            <span className="text-sm text-muted-foreground">{sub.substationId}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={Math.min(sub.utilizationPercent, 100)} 
                                className="w-24 h-2"
                              />
                              <span className={`text-sm font-medium ${
                                sub.utilizationPercent > 100 ? 'text-destructive' : 
                                sub.utilizationPercent > 85 ? 'text-chart-4' : 'text-chart-2'
                              }`}>
                                {formatNumber(sub.utilizationPercent, 1)}%
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">{sub.capacityMva} MVA</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRiskBadgeVariant(sub.riskLevel)} className="text-xs">
                            {sub.riskLevel}
                          </Badge>
                          {expandedSubstations.has(sub.substationId) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2 border-t border-border space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Current Load:</span>
                          <span className="ml-2 font-medium">{sub.currentLoadMw} MW</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Forecast Load:</span>
                          <span className="ml-2 font-medium">{sub.forecastLoadMw} MW</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">New DC Load:</span>
                          <span className="ml-2 font-medium">{sub.dcLoadMw} MW</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Feeders:</span>
                          <span className="ml-2 font-medium">{sub.feederCount}</span>
                        </div>
                      </div>
                      
                      {sub.needsUpgrade && sub.estimatedUpgradeCostMillions && (
                        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-sm">
                          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                          <span>
                            Upgrade Required: Est. ${formatNumber(sub.estimatedUpgradeCostMillions, 1)}M investment needed
                          </span>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="outline" size="sm" data-testid="button-view-details">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Detailed Analysis
          </Button>
          <Button variant="outline" size="sm" data-testid="button-compare-regions">
            Compare with Other Regions
          </Button>
          <Button variant="outline" size="sm" data-testid="button-generate-report">
            <Download className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
