import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  MapPin,
  User,
  DollarSign,
  Calendar,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import type { Claim } from "@shared/schema";
import { MockDataBanner } from "@/components/mock-data-banner";

interface ClaimDetailCardProps {
  data: Claim;
  isMockData?: boolean;
}

function getSeverityVariant(severity: string): "destructive" | "default" | "secondary" | "outline" {
  switch (severity) {
    case "catastrophic":
      return "destructive";
    case "major":
      return "default";
    case "moderate":
      return "secondary";
    default:
      return "outline";
  }
}

function getStatusVariant(status: string): "destructive" | "default" | "secondary" | "outline" {
  switch (status) {
    case "new":
    case "triaged":
      return "default";
    case "assigned":
    case "inspected":
      return "secondary";
    case "approved":
    case "settled":
    case "closed":
      return "outline";
    case "denied":
      return "destructive";
    default:
      return "outline";
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function ClaimDetailCard({ data, isMockData = false }: ClaimDetailCardProps) {
  return (
    <Card className="w-full max-w-3xl border-card-border" data-testid="card-claim-detail">
      {isMockData && (
        <div className="px-6 pt-4">
          <MockDataBanner />
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold" data-testid="text-claim-number">
                {data.claimNumber}
              </h3>
              <p className="text-sm text-muted-foreground">
                {data.policyholderName}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={getSeverityVariant(data.severity)} className="text-xs capitalize">
              {data.severity}
            </Badge>
            <Badge variant={getStatusVariant(data.status)} className="text-xs capitalize">
              {data.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm">
              <p data-testid="text-property-address">{data.propertyAddress}</p>
              <p className="text-muted-foreground">{data.propertyCity}, {data.propertyState} {data.propertyZip}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs capitalize">{data.damageType.replace("_", " ")}</Badge>
            </div>
            {data.estimatedLoss !== undefined && (
              <div className="flex items-center gap-1.5 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold" data-testid="text-estimated-loss">
                  {formatCurrency(data.estimatedLoss)}
                </span>
                <span className="text-muted-foreground">estimated loss</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          {data.assignedAdjusterName && (
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-muted-foreground" />
              <span data-testid="text-adjuster-name">{data.assignedAdjusterName}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Filed {new Date(data.filedDate).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="pt-2">
          <Link href={`/triage/${data.id}`}>
            <Button variant="outline" size="sm" data-testid="button-view-claim-detail">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
