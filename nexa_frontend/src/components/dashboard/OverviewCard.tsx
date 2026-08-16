"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CountUp from "./CountUp";

interface OverviewCardProps {
  stats: {
    total_flows?: number;
    total_alerts?: number;
    active_alerts?: number;
    detection_rate?: number;
    benign_flows?: number;
    resolved_alerts?: number;
  } | null;
  loading: boolean;
}

export default function OverviewCard({ stats, loading }: OverviewCardProps) {
  const totalFlows = stats?.total_flows || 0;
  const activeAlerts = stats?.active_alerts || 0;
  const benign = stats?.benign_flows || 0;
  const threats = Math.max(0, totalFlows - benign);
  const threatRatio = totalFlows > 0 ? Math.min(100, (threats / totalFlows) * 100) : 0;

  if (loading && !stats) {
    return <Skeleton className="h-[280px] w-full rounded-[var(--radius)]" />;
  }

  return (
    <Card className="p-6 shadow-none border-border bg-card">
      <header className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-foreground">Overall information</h3>
      </header>

      <div className="flex items-end gap-8 mb-5">
        <div>
          <div className="text-5xl font-semibold tabular-nums tracking-tight text-foreground">
            <CountUp end={totalFlows} duration={1.4} separator="," />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-tight">
            Flows analyzed<br />all time
          </p>
        </div>
        <div className="border-l border-border pl-8">
          <div className="text-5xl font-semibold tabular-nums tracking-tight text-foreground">
            <CountUp end={activeAlerts} duration={1.4} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-tight">
            Active alerts<br />right now
          </p>
        </div>
      </div>

      <div className="mb-5">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${threatRatio}%`,
              backgroundColor: "var(--color-status-critical)",
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
          <span>
            <span className="font-semibold" style={{ color: "var(--color-status-critical)" }}>
              {threatRatio.toFixed(1)}%
            </span>{" "}
            threats detected
          </span>
          <span className="tabular-nums">{threats.toLocaleString()} / {totalFlows.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat
          value={totalFlows}
          label="Flows"
          href="/reports"
          hint="Open reports"
          accent
        />
        <MiniStat
          value={activeAlerts}
          label="Active"
          href="/alerts"
          hint="See active alerts"
        />
        <MiniStat
          value={stats?.resolved_alerts || 0}
          label="Resolved"
          href="/incidents"
          hint="Open incidents"
        />
      </div>
    </Card>
  );
}

function MiniStat({
  value,
  label,
  href,
  hint,
  accent,
}: {
  value: number;
  label: string;
  href: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      title={hint}
      aria-label={`${label}: ${value}. ${hint}.`}
      className={`group rounded-2xl border transition-colors p-3 flex flex-col gap-1.5 items-start outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        accent
          ? "border-foreground bg-foreground text-background hover:bg-foreground/90"
          : "border-border bg-card text-foreground hover:border-foreground/40 hover:bg-accent/40"
      }`}
    >
      <div className="flex w-full items-center justify-between">
        <span
          className={`h-6 w-6 rounded-full grid place-items-center text-[10px] transition-colors ${
            accent
              ? "bg-background/10 text-background group-hover:bg-background/20"
              : "bg-muted text-foreground group-hover:bg-foreground group-hover:text-background"
          }`}
        >
          <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
      <div className="text-xl font-semibold tabular-nums leading-none">
        <CountUp end={value} duration={1.2} separator="," />
      </div>
      <span className={`text-[11px] ${accent ? "text-background/70" : "text-muted-foreground"}`}>
        {label}
      </span>
    </Link>
  );
}
