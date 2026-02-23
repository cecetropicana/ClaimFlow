import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  BarChart3,
  Calendar,
  Zap
} from "lucide-react";
import type { LoadForecast } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MockDataBanner } from "@/components/mock-data-banner";

interface LoadForecastCardProps {
  data: LoadForecast;
  isMockData?: boolean;
}

export function LoadForecastCard({ data, isMockData = false }: LoadForecastCardProps) {
  const chartData = data.forecast.reduce((acc, item) => {
    const existing = acc.find(d => d.year === item.year);
    if (existing) {
      existing[item.scenario] = item.peakMw;
    } else {
      acc.push({
        year: item.year,
        [item.scenario]: item.peakMw,
      });
    }
    return acc;
  }, [] as Array<{ year: number; base?: number; high?: number; low?: number }>);

  return (
    <Card className="w-full max-w-3xl border-card-border" data-testid="card-load-forecast">
      {isMockData && (
        <div className="px-6 pt-4">
          <MockDataBanner />
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-1/10">
              <BarChart3 className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Load Forecast Analysis</h3>
              <p className="text-sm text-muted-foreground">
                {data.nodeType}: {data.nodeId}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            10-Year Horizon
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Current Peak Load</span>
          </div>
          <p className="text-3xl font-bold" data-testid="text-current-peak">
            {data.currentPeakMw} MW
          </p>
        </div>

        <div className="aspect-video w-full p-4 border border-border rounded-lg">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                label={{ value: 'MW', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="base" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Base Scenario"
              />
              <Line 
                type="monotone" 
                dataKey="high" 
                stroke="hsl(var(--chart-4))" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
                name="High Growth"
              />
              <Line 
                type="monotone" 
                dataKey="low" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={{ r: 3 }}
                name="Low Growth"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <h4 className="text-base font-semibold">Scenario Comparison</h4>
          
          <div className="space-y-2">
            {data.comparisonScenarios.map((scenario) => {
              const TrendIcon = scenario.deltaPercent > 0 
                ? TrendingUp 
                : scenario.deltaPercent < 0 
                  ? TrendingDown 
                  : Minus;
              const trendColor = scenario.deltaPercent > 0 
                ? "text-chart-4" 
                : scenario.deltaPercent < 0 
                  ? "text-chart-2" 
                  : "text-muted-foreground";

              return (
                <div 
                  key={scenario.scenario}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                  data-testid={`scenario-${scenario.scenario}`}
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={scenario.scenario === "Base" ? "default" : "outline"} 
                      className="text-xs"
                    >
                      {scenario.scenario}
                    </Badge>
                    <span className="font-semibold">{scenario.peakMw} MW</span>
                  </div>
                  <div className={`flex items-center gap-1 ${trendColor}`}>
                    <TrendIcon className="h-4 w-4" />
                    <span className="font-medium">
                      {scenario.deltaPercent > 0 ? "+" : ""}{scenario.deltaPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="outline" size="sm" data-testid="button-download-forecast">
            Download Forecast Data
          </Button>
          <Button variant="outline" size="sm" data-testid="button-adjust-params">
            Adjust Parameters
          </Button>
          <Button variant="outline" size="sm" data-testid="button-compare-nodes">
            Compare with Other Nodes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
