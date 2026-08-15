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
import { getChartColor } from "@/lib/theme";

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

    const results = Object.entries(merged).map(([label, count], index) => {
      const key = label.toLowerCase().replace(/[^a-z0-9]/g, "");
      const color = getChartColor(index);

      chartConfig[key] = { label, color };

      return { type: label, count, fill: color, key };
    });

    const totalVal = Object.values(merged).reduce((a, b) => a + b, 0);
    return { chartData: results, total: totalVal };
  }, [data, chartConfig]);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-[250px] w-full rounded-full" />
      </div>
    );
  }

  const hasData = data && chartData.length > 0 && total > 0;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-sm font-semibold text-foreground">Attack types</h2>
        <span className="text-xs text-muted-foreground">By volume</span>
      </div>
      <p className="text-xs text-muted-foreground mb-6">Distribution of detected categories.</p>

      {!hasData ? (
        <div className="flex flex-col items-center justify-center min-h-[260px] rounded-2xl border border-dashed border-border/80 bg-muted/10 p-6 text-center">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center mb-3">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-foreground">Woohoo! No attacks detected</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-normal">
            No attacks or malicious categories have been identified.
          </p>
        </div>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[260px]"
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
            innerRadius={72}
            outerRadius={100}
            paddingAngle={1}
            stroke="var(--card)"
            strokeWidth={2}
            isAnimationActive
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${entry.key}-${index}`} fill={entry.fill} />
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
                        className="fill-foreground text-2xl font-semibold tabular-nums"
                      >
                        {total.toLocaleString()}
                      </tspan>
                      <tspan
                        x={viewBox.cx}
                        y={(viewBox.cy || 0) + 20}
                        className="fill-muted-foreground text-[11px] font-medium"
                      >
                        Total flows
                      </tspan>
                    </text>
                  );
                }
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      )}
    </div>
  );
}
