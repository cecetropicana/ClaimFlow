import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import type { Adjuster } from "@shared/schema";
import { MockDataBanner } from "@/components/mock-data-banner";

interface AdjusterWorkloadCardProps {
  data: Adjuster[];
  isMockData?: boolean;
}

function getStatusVariant(status: string): "destructive" | "default" | "secondary" | "outline" {
  switch (status) {
    case "available":
      return "default";
    case "busy":
      return "secondary";
    case "unavailable":
      return "destructive";
    default:
      return "outline";
  }
}

export function AdjusterWorkloadCard({ data, isMockData = false }: AdjusterWorkloadCardProps) {
  const available = data.filter((a) => a.status === "available").length;
  const totalCapacity = data.reduce((sum, a) => sum + a.maxCaseload, 0);
  const totalCurrent = data.reduce((sum, a) => sum + a.currentCaseload, 0);

  return (
    <Card className="w-full max-w-3xl border-card-border" data-testid="card-adjuster-workload">
      {isMockData && (
        <div className="px-6 pt-4">
          <MockDataBanner />
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Adjuster Workload</h3>
              <p className="text-sm text-muted-foreground">
                {available} of {data.length} adjusters available
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {totalCurrent}/{totalCapacity} capacity
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {data.map((adjuster) => {
            const pct = adjuster.maxCaseload > 0
              ? (adjuster.currentCaseload / adjuster.maxCaseload) * 100
              : 0;
            return (
              <div
                key={adjuster.id}
                className="p-3 border border-border rounded-lg space-y-2"
                data-testid={`adjuster-row-${adjuster.id}`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{adjuster.name}</span>
                    <Badge variant={getStatusVariant(adjuster.status)} className="text-xs capitalize">
                      {adjuster.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {adjuster.currentCaseload}/{adjuster.maxCaseload} cases
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="flex flex-wrap gap-1">
                  {adjuster.specialties.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2">
          <Link href="/adjusters">
            <Button variant="default" size="sm" data-testid="button-manage-adjusters">
              <ArrowRight className="h-4 w-4 mr-2" />
              Manage Adjusters
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
