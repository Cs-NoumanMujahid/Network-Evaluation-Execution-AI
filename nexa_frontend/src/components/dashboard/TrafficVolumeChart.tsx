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
        <Skeleton className="h-6 w-32" />
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

  return (
    <div className="relative">
      <h2 className="text-lg font-medium mb-6">Traffic Volume (Last 60m)</h2>

      <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
        <AreaChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
          <defs>
            <linearGradient id="fill-flows" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={cyberPalette.blue} stopOpacity={0.3} />
              <stop offset="95%" stopColor={cyberPalette.blue} stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="fill-alerts" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={cyberPalette.red} stopOpacity={0.3} />
              <stop offset="95%" stopColor={cyberPalette.red} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeOpacity={0.1} />
          <XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-[10px] font-medium"
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-[10px] font-medium" />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Area
            dataKey="flows"
            type="monotone"
            stroke={cyberPalette.blue}
            strokeWidth={2}
            fill="url(#fill-flows)"
            isAnimationActive={true}
          />
          <Area
            dataKey="alerts"
            type="monotone"
            stroke={cyberPalette.red}
            strokeWidth={2}
            fill="url(#fill-alerts)"
            isAnimationActive={true}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
