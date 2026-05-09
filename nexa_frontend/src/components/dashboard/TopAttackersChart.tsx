"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, TooltipProps, Cell } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { getAttackColor } from "@/lib/theme";

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
      <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-lg p-3 shadow-xl">
        <p className="font-bold text-sm mb-1 text-foreground">{data.src_ip}</p>
        <div className="flex items-center gap-2 mb-2">
           <span className="text-xs text-muted-foreground uppercase tracking-wider">Alerts:</span>
           <span className="text-xs font-bold text-cyber-red">{data.count}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {data.attack_types.map((type: string, i: number) => (
            <span 
              key={`${type}-${i}`} 
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted border border-border/50 text-muted-foreground font-semibold"
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
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[250px] w-full" />
      </div>
    );
  }

  if (!data) return null;

  const chartConfig: ChartConfig = {
    count: { label: "Alerts" },
  };

  return (
    <div className="relative">
      <h2 className="text-lg font-medium mb-6">Top Attackers</h2>

      <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
        <BarChart accessibilityLayer data={data.attackers} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid horizontal={false} strokeOpacity={0.1} />
          <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px] font-medium" />
          <YAxis
            dataKey="src_ip"
            type="category"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={100}
            className="text-[10px] font-bold"
          />
          <ChartTooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<CustomTooltip />} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} isAnimationActive={true}>
            {data.attackers.map((entry, index) => {
              const color = getAttackColor(entry.attack_types[0] || "unknown");
              return <Cell key={`cell-${index}`} fill={color} fillOpacity={0.8} />;
            })}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
