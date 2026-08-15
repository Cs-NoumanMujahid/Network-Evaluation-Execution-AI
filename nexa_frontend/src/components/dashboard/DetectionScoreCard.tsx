"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import { useMemo } from "react";
import { getAttackColor } from "@/lib/theme";

interface DetectionScoreCardProps {
  stats: {
    detection_rate?: number;
    total_flows?: number;
    total_alerts?: number;
    benign_flows?: number;
  } | null;
  attackTypes: {
    labels: string[];
    values: number[];
  } | null;
  loading: boolean;
}

export default function DetectionScoreCard({ stats, attackTypes, loading }: DetectionScoreCardProps) {
  const total = stats?.total_flows || 0;
  const detectionRate = total > 0 ? (stats?.detection_rate || 0) : 0;

  const breakdown = useMemo(() => {
    if (!attackTypes) return [];
    return attackTypes.labels.slice(0, 3).map((label, i) => ({
      label,
      pct: total > 0 ? Math.round((attackTypes.values[i] / total) * 100) : 0,
      color: getAttackColor(label),
    }));
  }, [attackTypes, total]);

  if (loading && !stats) {
    return <Skeleton className="h-[280px] w-full rounded-[var(--radius)]" />;
  }

  return (
    <Card className="p-6 shadow-none border-border bg-card flex flex-col">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-foreground">Detection rate</h3>
      </header>

      <p className="text-xs text-muted-foreground mb-4">
        <span className="text-foreground font-semibold tabular-nums">{detectionRate.toFixed(1)}%</span>{" "}
        of flows flagged as threats (alerts ÷ total flows)
      </p>

      <div className="flex items-center gap-5 flex-1">
        <div className="flex-1 space-y-2.5">
          {breakdown.map((b, i) => (
            <div key={`${b.label}-${i}`} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: b.color }}
              />
              <span className="text-muted-foreground flex-1 truncate">{b.label}</span>
              <span className="text-foreground font-medium tabular-nums">{b.pct}%</span>
            </div>
          ))}
        </div>

        <RingChart value={Math.min(100, detectionRate)} colors={breakdown.map((b) => b.color)} />
      </div>

      <Button className="mt-5 h-10 rounded-full bg-foreground text-background hover:bg-foreground/90 gap-2 w-full">
        <Download className="h-4 w-4" />
        Download report
      </Button>
    </Card>
  );
}

function RingChart({ value, colors = [] }: { value: number; colors?: string[] }) {
  const r1 = 38, r2 = 30, r3 = 22;
  const c = (r: number) => 2 * Math.PI * r;
  const dash = (r: number, pct: number) => `${(c(r) * pct) / 100} ${c(r)}`;

  const [c1, c2, c3] = [
    colors[0] ?? "var(--color-status-info)",
    colors[1] ?? "var(--color-status-medium)",
    colors[2] ?? "var(--color-status-high)",
  ];

  return (
    <svg width="110" height="110" viewBox="0 0 110 110" className="shrink-0">
      <g transform="rotate(-90 55 55)">
        <circle cx="55" cy="55" r={r1} fill="none" stroke="var(--muted)" strokeWidth="6" />
        <circle
          cx="55"
          cy="55"
          r={r1}
          fill="none"
          stroke={c1}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={dash(r1, value)}
        />
        <circle cx="55" cy="55" r={r2} fill="none" stroke="var(--muted)" strokeWidth="6" />
        <circle
          cx="55"
          cy="55"
          r={r2}
          fill="none"
          stroke={c2}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={dash(r2, Math.max(8, value * 0.6))}
        />
        <circle cx="55" cy="55" r={r3} fill="none" stroke="var(--muted)" strokeWidth="6" />
        <circle
          cx="55"
          cy="55"
          r={r3}
          fill="none"
          stroke={c3}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={dash(r3, Math.max(5, value * 0.3))}
        />
      </g>
      <text
        x="55"
        y="58"
        textAnchor="middle"
        className="fill-foreground text-[15px] font-semibold tabular-nums"
      >
        {value.toFixed(0)}%
      </text>
    </svg>
  );
}
