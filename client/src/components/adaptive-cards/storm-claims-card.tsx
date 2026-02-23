import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CloudLightning,
  FileText,
  DollarSign
} from "lucide-react";
import type { StormEvent } from "@shared/schema";
import { MockDataBanner } from "@/components/mock-data-banner";

interface StormClaimsCardProps {
  data: {
    stormEvents: StormEvent[];
    claimsByStorm: Array<{
      stormEventId: string;
      stormName: string;
      count: number;
      totalLoss: number;
    }>;
  };
  isMockData?: boolean;
}

function getStatusVariant(status: string): "destructive" | "default" | "secondary" | "outline" {
  switch (status) {
    case "active":
      return "destructive";
    case "monitoring":
      return "default";
    case "past":
      return "outline";
    default:
      return "outline";
  }
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function StormClaimsCard({ data, isMockData = false }: StormClaimsCardProps) {
  const { stormEvents, claimsByStorm } = data;

  const stormMap = new Map(stormEvents.map((s) => [s.id, s]));

  return (
    <Card className="w-full max-w-3xl border-card-border" data-testid="card-storm-claims">
      {isMockData && (
        <div className="px-6 pt-4">
          <MockDataBanner />
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10">
            <CloudLightning className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Storm Claims Overview</h3>
            <p className="text-sm text-muted-foreground">
              {stormEvents.length} storm events tracked
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {claimsByStorm.map((entry) => {
          const storm = stormMap.get(entry.stormEventId);
          return (
            <div
              key={entry.stormEventId}
              className="p-4 border border-border rounded-lg space-y-3"
              data-testid={`storm-entry-${entry.stormEventId}`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{entry.stormName}</span>
                    {storm && (
                      <>
                        <Badge variant="outline" className="text-xs">
                          Category {storm.category}
                        </Badge>
                        <Badge variant={getStatusVariant(storm.status)} className="text-xs capitalize">
                          {storm.status}
                        </Badge>
                      </>
                    )}
                  </div>
                  {storm && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {storm.affectedRegions.join(", ")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium" data-testid={`text-storm-claims-${entry.stormEventId}`}>
                    {entry.count}
                  </span>
                  <span className="text-muted-foreground">claims</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium" data-testid={`text-storm-loss-${entry.stormEventId}`}>
                    {formatCurrency(entry.totalLoss)}
                  </span>
                  <span className="text-muted-foreground">total loss</span>
                </div>
              </div>
            </div>
          );
        })}

        {claimsByStorm.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No storm claims data available.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
