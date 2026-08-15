"use client";

import { CartesianGrid, Area, AreaChart, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cyberPalette } from "@/lib/theme";

interface TrafficVolumeChartProps {
  data: {
    labels: string[];
    flows: number[];
    alerts: number[];
  } | null;
  loading: boolean;
}

const chartConfig = {
  flows: {
    label: "Flows",
    color: cyberPalette.blue,
  },
  alerts: {
    label: "Alerts",
    color: cyberPalette.red,
  },
} satisfies ChartConfig;

export default function TrafficVolumeChart({ data, loading }: TrafficVolumeChartProps) {
  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-[250px] w-full" />
      </div>
    );
  }

  if (!data) return null;

  const chartData = data.labels.map((label, i) => ({
    time: label,
    flows: data.flows[i],
    alerts: data.alerts[i],
  }));

  const hasData = chartData.length > 0 && (chartData.some(d => d.flows > 0) || chartData.some(d => d.alerts > 0));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-sm font-semibold text-foreground">Traffic volume</h2>
        <span className="text-xs text-muted-foreground">Last 60 minutes</span>
      </div>
      <p className="text-xs text-muted-foreground mb-6">Flows and alerts over time.</p>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center min-h-[260px] rounded-2xl border border-dashed border-border/80 bg-muted/10 p-6 text-center">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center mb-3">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-foreground">Woohoo! No traffic yet</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-normal">
            Start a scan or run traffic to populate the volume charts.
          </p>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
          <AreaChart accessibilityLayer data={chartData} margin={{ top: 4, left: -16, right: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <ChartTooltip cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              dataKey="flows"
              type="monotone"
              stroke={cyberPalette.blue}
              strokeWidth={2}
              fill={cyberPalette.blue}
              fillOpacity={0.12}
              isAnimationActive
            />
            <Area
              dataKey="alerts"
              type="monotone"
              stroke={cyberPalette.red}
              strokeWidth={2}
              fill={cyberPalette.red}
              fillOpacity={0.12}
              isAnimationActive
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
