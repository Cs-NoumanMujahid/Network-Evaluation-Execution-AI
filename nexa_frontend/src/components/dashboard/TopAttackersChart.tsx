"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, TooltipProps, Cell } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { getChartColor } from "@/lib/theme";

interface TopAttackersChartProps {
  data: {
    attackers: {
      src_ip: string;
      count: number;
      attack_types: string[];
    }[];
  } | null;
  loading: boolean;
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-md p-3 shadow-md">
        <p className="font-mono text-xs font-semibold text-foreground mb-2">{data.src_ip}</p>
        <div className="flex items-center justify-between gap-4 mb-2">
          <span className="text-xs text-muted-foreground">Alerts</span>
          <span className="text-xs font-semibold text-foreground tabular-nums">{data.count}</span>
        </div>
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {data.attack_types.map((type: string, i: number) => (
            <span
              key={`${type}-${i}`}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium"
            >
              {type}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function TopAttackersChart({ data, loading }: TopAttackersChartProps) {
  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-[250px] w-full" />
      </div>
    );
  }

  if (!data) return null;

  const chartConfig: ChartConfig = {
    count: { label: "Alerts" },
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-sm font-semibold text-foreground">Top attackers</h2>
        <span className="text-xs text-muted-foreground">By alert count</span>
      </div>
      <p className="text-xs text-muted-foreground mb-6">Source IPs ranked by triggered alerts.</p>

      <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
        <BarChart accessibilityLayer data={data.attackers} layout="vertical" margin={{ top: 4, left: 8, right: 8 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            dataKey="src_ip"
            type="category"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={110}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
          />
          <ChartTooltip cursor={{ fill: "var(--accent)" }} content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive>
            {data.attackers.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getChartColor(index)}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
