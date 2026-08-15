"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAttackColor } from "@/lib/theme";

const statusColors: Record<string, string> = {
  Active:     "var(--color-status-critical)",
  Mitigating: "var(--color-status-medium)",
  Resolved:   "var(--color-status-low)",
};

interface Attacker {
  src_ip: string;
  count: number;
  attack_types: string[];
}

interface RecentIncidentsRowProps {
  data: { attackers: Attacker[] } | null;
  totalAlerts: number;
  loading: boolean;
}

export default function RecentIncidentsRow({ data, totalAlerts, loading }: RecentIncidentsRowProps) {
  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-[100px] rounded-[var(--radius)]" />
        <Skeleton className="h-[100px] rounded-[var(--radius)]" />
        <Skeleton className="h-[100px] rounded-[var(--radius)]" />
      </div>
    );
  }

  const items = (data?.attackers || []).slice(0, 3);
  const max = totalAlerts || items.reduce((m, i) => Math.max(m, i.count), 1);

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-foreground px-1">Recent incidents</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item) => {
          const pct = Math.min(100, Math.round((item.count / max) * 100));
          const status = pct > 60 ? "Active" : pct > 25 ? "Mitigating" : "Resolved";
          const attackColor = getAttackColor(item.attack_types[0] || "unknown");
          return (
            <Link
              key={item.src_ip}
              href={`/alerts?src_ip=${encodeURIComponent(item.src_ip)}`}
              title={`View alerts from ${item.src_ip}`}
              className="block group"
            >
              <Card className="p-5 shadow-none border-border bg-card transition-colors group-hover:border-foreground/40 group-hover:bg-accent/30 h-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {item.attack_types[0] || "Unknown attack"}
                      </h4>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: statusColors[status] }}
                      >
                        {status}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">{item.src_ip}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {item.count.toLocaleString()} alerts triggered from this source.
                    </p>
                  </div>

                  <ProgressDial value={pct} color={attackColor} />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ProgressDial({ value, color = "var(--foreground)" }: { value: number; color?: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
      <g transform="rotate(-90 24 24)">
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--muted)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(c * value) / 100} ${c}`}
        />
      </g>
      <text
        x="24"
        y="27"
        textAnchor="middle"
        className="fill-foreground text-[10px] font-semibold tabular-nums"
      >
        {value}%
      </text>
    </svg>
  );
}
