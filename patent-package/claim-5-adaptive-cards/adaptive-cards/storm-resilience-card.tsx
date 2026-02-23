import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Cloud, 
  Wind, 
  Users, 
  AlertTriangle,
  Clock,
  Shield,
  MapPin
} from "lucide-react";
import type { StormResilience } from "@shared/schema";
import { MockDataBanner } from "@/components/mock-data-banner";

interface StormResilienceCardProps {
  data: StormResilience;
  isMockData?: boolean;
}

function getWindZoneBadgeVariant(zone: string): "destructive" | "default" | "secondary" | "outline" {
  switch (zone) {
    case "EXTREME":
      return "destructive";
    case "HIGH":
      return "default";
    case "MODERATE":
      return "secondary";
    default:
      return "outline";
  }
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function StormResilienceCard({ data, isMockData = false }: StormResilienceCardProps) {
  const { storm, impactSummary, affectedSubstations } = data;

  return (
    <Card className="w-full max-w-3xl border-card-border" data-testid="card-storm-resilience">
      {isMockData && (
        <div className="px-6 pt-4">
          <MockDataBanner />
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-5/10">
              <Cloud className="h-5 w-5 text-chart-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Storm Resilience Assessment</h3>
              <p className="text-sm text-muted-foreground">
                {storm.name} - Category {storm.category}
              </p>
            </div>
          </div>
          <Badge variant="destructive" className="text-xs">
            <Wind className="h-3 w-3 mr-1" />
            {storm.windSpeedMph} mph
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="font-semibold text-sm">Impact Summary</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Customers at Risk</p>
              <p className="text-2xl font-bold" data-testid="text-customers-risk">
                {formatNumber(impactSummary.totalCustomersAtRisk)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Critical Facilities</p>
              <p className="text-2xl font-bold" data-testid="text-critical-facilities">
                {impactSummary.criticalFacilitiesAtRisk}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Substations in Path</p>
              <p className="text-2xl font-bold" data-testid="text-substations-path">
                {impactSummary.substationsInPath}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Est. Restoration</p>
              <p className="text-2xl font-bold" data-testid="text-restoration-hours">
                {impactSummary.estimatedRestorationHours}h
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Risk Score</span>
            <span className="text-sm font-bold">{impactSummary.riskScore}/100</span>
          </div>
          <Progress 
            value={impactSummary.riskScore} 
            className="h-3"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Expected landfall: {new Date(storm.estimatedLandfall).toLocaleString()}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {storm.affectedRegions.map((region) => (
              <Badge key={region} variant="outline" className="text-xs">
                {region}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Affected Substations
          </h4>
          
          <div className="space-y-3">
            {affectedSubstations.map((sub) => (
              <div 
                key={sub.substationId}
                className="p-4 border border-border rounded-lg space-y-3"
                data-testid={`card-substation-${sub.substationId}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{sub.substationName}</span>
                      <Badge variant={getWindZoneBadgeVariant(sub.windZone)} className="text-xs">
                        {sub.windZone} Wind Zone
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {sub.substationId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Vulnerability</p>
                    <p className="font-bold">{sub.vulnerabilityScore}/100</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{formatNumber(sub.customersServed)} customers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-chart-4" />
                    <span>{sub.criticalLoads} critical loads</span>
                  </div>
                </div>

                {sub.recommendedActions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Recommended Actions
                    </p>
                    <ul className="space-y-1">
                      {sub.recommendedActions.map((action, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-chart-2 mt-1">•</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="default" size="sm" data-testid="button-activate-response">
            Activate Emergency Response
          </Button>
          <Button variant="outline" size="sm" data-testid="button-view-map">
            View Storm Path Map
          </Button>
          <Button variant="outline" size="sm" data-testid="button-crew-status">
            <Clock className="h-4 w-4 mr-2" />
            Check Crew Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
