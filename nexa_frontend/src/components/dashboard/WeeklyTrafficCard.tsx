"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cyberPalette } from "@/lib/theme";

interface WeeklyTrafficCardProps {
  data: {
    labels: string[];
    flows: number[];
    alerts: number[];
  } | null;
  loading: boolean;
}

export default function WeeklyTrafficCard({ data, loading }: WeeklyTrafficCardProps) {
  if (loading && !data) {
    return <Skeleton className="h-[280px] w-full rounded-[var(--radius)]" />;
  }

  if (!data) return null;

  const chartData = data.labels.map((label, i) => ({
    time: label,
    flows: data.flows[i],
    alerts: data.alerts[i],
  }));

  const hasData = chartData.length > 0 && (chartData.some(d => d.flows > 0) || chartData.some(d => d.alerts > 0));

  return (
    <Card className="p-6 shadow-none border-border bg-card flex flex-col">
      <header className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-foreground">Traffic this week</h3>
        <div className="h-8 w-8 grid place-items-center rounded-full bg-muted text-foreground">
          <TrendingUp className="h-4 w-4" />
        </div>
      </header>

      <div className="flex items-center gap-5 mb-3 text-xs text-muted-foreground">
        <Legend color={cyberPalette.blue} label="Flows" />
        <Legend color={cyberPalette.red} label="Alerts" />
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[220px] rounded-2xl border border-dashed border-border/80 bg-muted/10 p-6 text-center mt-3">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center mb-3">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold text-foreground">Woohoo! No activity yet</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-normal">
            No flows or alerts generated this week.
          </p>
        </div>
      ) : (
        <div className="flex-1 -mx-2 min-h-[200px]">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "var(--muted-foreground)", fontSize: "11px" }}
              />
              <Area
                type="monotone"
                dataKey="flows"
                stroke={cyberPalette.blue}
                strokeWidth={2.25}
                fill={cyberPalette.blue}
                fillOpacity={0.14}
                isAnimationActive
                dot={{ r: 3, fill: "var(--background)", stroke: cyberPalette.blue, strokeWidth: 1.75 }}
                activeDot={{ r: 5, stroke: cyberPalette.blue, fill: cyberPalette.blue }}
              />
              <Area
                type="monotone"
                dataKey="alerts"
                stroke={cyberPalette.red}
                strokeWidth={1.75}
                fill="transparent"
                strokeDasharray="4 4"
                isAnimationActive
                dot={{ r: 2.5, fill: cyberPalette.red, stroke: cyberPalette.red }}
                activeDot={{ r: 4, stroke: cyberPalette.red, fill: cyberPalette.red }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
