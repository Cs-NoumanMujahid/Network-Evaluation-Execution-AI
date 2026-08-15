"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { severityColors } from "@/lib/theme";

interface SeverityChartProps {
  data: {
    labels: string[];
    values: number[];
  } | null;
  loading: boolean;
}

export default function SeverityChart({ data, loading }: SeverityChartProps) {
  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (!data) return null;

  const chartConfig: ChartConfig = {
    count: { label: "Alerts" },
  };

  const chartData = data.labels.map((label, index) => ({
    severity: label,
    count: data.values[index],
  }));

  const hasData = chartData.length > 0 && chartData.some((d) => d.count > 0);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-sm font-semibold text-foreground">Severity distribution</h2>
        <span className="text-xs text-muted-foreground">All alerts</span>
      </div>
      <p className="text-xs text-muted-foreground mb-6">Severity bands for detected alerts.</p>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center min-h-[260px] rounded-2xl border border-dashed border-border/80 bg-muted/10 p-6 text-center">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center mb-3">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-foreground">Woohoo! No alerts yet</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-normal">
            No threats or anomalies detected in the network flows.
          </p>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
          <BarChart accessibilityLayer data={chartData} margin={{ top: 4, left: -16, right: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="severity"
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              tickLine={false}
              tickMargin={8}
              axisLine={false}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <ChartTooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={severityColors[entry.severity]} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
