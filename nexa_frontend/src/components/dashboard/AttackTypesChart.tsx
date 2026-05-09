"use client";

import { useMemo } from "react";
import { Label, Pie, PieChart, Cell } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { getAttackColor } from "@/lib/theme";

interface AttackTypesChartProps {
  data: {
    labels: string[];
    values: number[];
  } | null;
  loading: boolean;
}

export default function AttackTypesChart({ data, loading }: AttackTypesChartProps) {
  const chartConfig: ChartConfig = useMemo(() => ({
    count: { label: "Attacks" },
  }), []);

  const { chartData, total } = useMemo(() => {
    if (!data) return { chartData: [], total: 0 };

    const merged: Record<string, number> = {};
    data.labels.forEach((label, index) => {
      const cleanLabel = label.trim();
      merged[cleanLabel] = (merged[cleanLabel] || 0) + data.values[index];
    });

    const results = Object.entries(merged).map(([label, count]) => {
      const key = label.toLowerCase().replace(/[^a-z0-9]/g, "");
      const color = getAttackColor(label);

      chartConfig[key] = {
        label,
        color: color,
      };

      return {
        type: label,
        count: count,
        fill: color,
        key: key
      };
    });

    const totalVal = Object.values(merged).reduce((a, b) => a + b, 0);
    return { chartData: results, total: totalVal };
  }, [data, chartConfig]);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-[250px] w-full rounded-full" />
      </div>
    );
  }

  if (!data || chartData.length === 0) return null;

  return (
    <div className="relative">
      <h2 className="text-lg font-medium mb-6">Attack Types</h2>

      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[250px]"
      >
        <PieChart>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="type"
            innerRadius={65}
            outerRadius={85}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={true}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${entry.key}-${index}`}
                fill={entry.fill}
              />
            ))}
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text
                      x={viewBox.cx}
                      y={viewBox.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={viewBox.cx}
                        y={viewBox.cy}
                        className="fill-foreground text-3xl font-bold tabular-nums"
                      >
                        {total.toLocaleString()}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 24}
                        className="fill-muted-foreground text-[10px] uppercase tracking-widest font-semibold"
                      >
                        Total Flows
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
    </div>
  );
}
