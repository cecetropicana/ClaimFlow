import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  CheckCircle2, 
  XCircle,
  Zap,
  Building2,
  ArrowRight,
  Clock,
  DollarSign
} from "lucide-react";
import type { CapacityCheck } from "@shared/schema";
import { MockDataBanner } from "@/components/mock-data-banner";

interface CapacityCheckCardProps {
  data: CapacityCheck;
  isMockData?: boolean;
}

export function CapacityCheckCard({ data, isMockData = false }: CapacityCheckCardProps) {
  const { requestedCapacityMw, location, nearbySubstations, recommendation } = data;

  return (
    <Card className="w-full max-w-3xl border-card-border" data-testid="card-capacity-check">
      {isMockData && (
        <div className="px-6 pt-4">
          <MockDataBanner />
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-2/10">
              <Zap className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Capacity Check Results</h3>
              <p className="text-sm text-muted-foreground">
                Request: {requestedCapacityMw} MW
              </p>
            </div>
          </div>
          {recommendation.feasible ? (
            <Badge variant="outline" className="text-chart-2 border-chart-2/30 bg-chart-2/10">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Feasible
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Not Feasible
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Requested Location</p>
            <p className="text-xs text-muted-foreground">
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold">Nearby Substations</h4>
          
          <div className="space-y-3">
            {nearbySubstations.map((sub) => (
              <div 
                key={sub.substationId}
                className={`p-4 border rounded-lg ${
                  sub.canServeRequest 
                    ? 'border-chart-2/30 bg-chart-2/5' 
                    : 'border-border'
                }`}
                data-testid={`substation-${sub.substationId}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{sub.substationName}</span>
                      {sub.canServeRequest && (
                        <Badge variant="outline" className="text-xs text-chart-2 border-chart-2/30">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {sub.substationId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{sub.distanceMiles.toFixed(1)} mi</p>
                    <p className="text-xs text-muted-foreground">distance</p>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="text-muted-foreground">Available:</span>
                    <span className={`ml-2 font-medium ${
                      sub.availableCapacityMw >= requestedCapacityMw 
                        ? 'text-chart-2' 
                        : 'text-destructive'
                    }`}>
                      {sub.availableCapacityMw} MW
                    </span>
                  </div>
                  {!sub.canServeRequest && sub.constraintReason && (
                    <span className="text-xs text-muted-foreground italic">
                      {sub.constraintReason}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {recommendation.feasible && recommendation.recommendedSubstation && (
          <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-chart-2" />
              <span className="font-semibold">Recommendation</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{recommendation.recommendedSubstation}</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Best option for your capacity request</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              {recommendation.estimatedCost && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated Cost</p>
                    <p className="font-medium">${(recommendation.estimatedCost / 1000000).toFixed(1)}M</p>
                  </div>
                </div>
              )}
              {recommendation.timelineMonths && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Timeline</p>
                    <p className="font-medium">{recommendation.timelineMonths} months</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {recommendation.alternativeOptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Alternative Options:</p>
            <ul className="space-y-1">
              {recommendation.alternativeOptions.map((option, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  {option}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="default" size="sm" data-testid="button-submit-request">
            Submit Connection Request
          </Button>
          <Button variant="outline" size="sm" data-testid="button-view-map">
            View on Map
          </Button>
          <Button variant="outline" size="sm" data-testid="button-contact-planner">
            Contact Planner
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
