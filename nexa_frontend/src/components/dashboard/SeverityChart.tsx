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
        <Skeleton className="h-6 w-32" />
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

  return (
    <div className="relative">
      <h2 className="text-lg font-medium mb-6">Severity Distribution</h2>
      <div className="absolute inset-0 bg-cyber-amber/5 dark:bg-cyber-amber/15 rounded-full blur-3xl -z-10" />
      <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
        <BarChart accessibilityLayer data={chartData}>
          <defs>
            {chartData.map((entry, index) => (
              <linearGradient key={`grad-${index}`} id={`bar-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={severityColors[entry.severity]} stopOpacity={0.8} />
                <stop offset="100%" stopColor={severityColors[entry.severity]} stopOpacity={0.2} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} strokeOpacity={0.1} />
          <XAxis
            dataKey="severity"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            className="text-[10px] font-bold tracking-wider"
          />
          <YAxis
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            className="text-[10px] font-medium"
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={true}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#bar-grad-${index})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
