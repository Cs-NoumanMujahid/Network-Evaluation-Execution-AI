"use client";

import Link from "next/link";
import { Download, Activity, ShieldAlert, Zap, ServerCrash, ArrowUpRight } from "lucide-react";

import { useDashboardData } from "@/hooks/useDashboardData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SeverityChart from "@/components/dashboard/SeverityChart";
import AttackTypesChart from "@/components/dashboard/AttackTypesChart";
import { getAttackColor, severityColors } from "@/lib/theme";

export default function ReportsPage() {
  const { stats, attackTypes, severity, topAttackers, topTargets, alerts, loading } =
    useDashboardData();

  const targets = topTargets?.targets || [];

  const exportCSV = () => {
    if (!alerts?.results || alerts.results.length === 0) return;
    const headers = [
      "id",
      "timestamp",
      "severity",
      "prediction",
      "src_ip",
      "dst_ip",
      "dst_port",
      "protocol",
      "confidence",
      "source_type",
    ];
    const rows = alerts.results.map((a) =>
      [
        a.id,
        a.timestamp,
        a.severity,
        a.prediction,
        a.src_ip,
        a.dst_ip,
        a.dst_port,
        a.protocol,
        a.confidence,
        a.source_type,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nexa-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-40 w-full rounded-[var(--radius)]" />
        <Skeleton className="h-72 w-full rounded-[var(--radius)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregated detection summary across all monitored sources.
          </p>
        </div>
        <Button onClick={exportCSV} className="h-9 gap-2" disabled={!alerts?.results?.length}>
          <Download className="h-4 w-4" />
          Export alerts (CSV)
        </Button>
      </header>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryTile
          icon={Activity}
          label="Total flows"
          value={(stats?.total_flows || 0).toLocaleString()}
          color="var(--color-status-info)"
        />
        <SummaryTile
          icon={ShieldAlert}
          label="Total alerts"
          value={(stats?.total_alerts || 0).toLocaleString()}
          color="var(--color-status-critical)"
        />
        <SummaryTile
          icon={ServerCrash}
          label="Active alerts"
          value={(stats?.active_alerts || 0).toLocaleString()}
          color="var(--color-status-high)"
        />
        <SummaryTile
          icon={Zap}
          label="Detection rate"
          value={`${(stats?.detection_rate || 0).toFixed(2)}%`}
          color="var(--color-status-medium)"
        />
      </div>

      {/* Distribution charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7 p-6 shadow-none border-border bg-card">
          <SeverityChart data={severity} loading={loading} />
        </Card>
        <Card className="lg:col-span-5 p-6 shadow-none border-border bg-card">
          <AttackTypesChart data={attackTypes} loading={loading} />
        </Card>
      </div>

      {/* Tables: Attack types, Top sources, Top destinations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attack types breakdown */}
        <Card className="p-6 shadow-none border-border bg-card">
          <h3 className="text-base font-semibold text-foreground mb-1">Attack types</h3>
          <p className="text-xs text-muted-foreground mb-4">By detection volume</p>
          {attackTypes?.labels?.length ? (
            <ul className="space-y-2.5">
              {attackTypes.labels.map((label, i) => {
                const value = attackTypes.values[i];
                const total = attackTypes.values.reduce((a, b) => a + b, 0) || 1;
                const pct = (value / total) * 100;
                const color = getAttackColor(label);
                return (
                  <li key={`${label}-${i}`} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium text-foreground">{label}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {value.toLocaleString()}{" "}
                        <span className="text-foreground font-semibold ml-1">
                          {pct.toFixed(1)}%
                        </span>
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No data yet.</p>
          )}
        </Card>

        {/* Top sources */}
        <Card className="p-6 shadow-none border-border bg-card">
          <h3 className="text-base font-semibold text-foreground mb-1">Top sources</h3>
          <p className="text-xs text-muted-foreground mb-4">Most active attackers</p>
          {topAttackers?.attackers?.length ? (
            <ul className="space-y-1">
              {topAttackers.attackers.slice(0, 5).map((a, i) => {
                const color = getAttackColor(a.attack_types[0] || "unknown");
                return (
                  <li key={a.src_ip}>
                    <Link
                      href={`/alerts?src_ip=${encodeURIComponent(a.src_ip)}`}
                      title={`Filter alerts to source ${a.src_ip}`}
                      className="group flex items-center gap-3 text-xs py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
                    >
                      <span className="text-muted-foreground/70 font-mono w-4 shrink-0 tabular-nums">
                        {i + 1}.
                      </span>
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-mono text-foreground truncate flex-1">{a.src_ip}</span>
                      <span className="tabular-nums font-semibold text-foreground shrink-0">
                        {a.count.toLocaleString()}
                      </span>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No data yet.</p>
          )}
        </Card>

        {/* Top targeted destinations */}
        <Card className="p-6 shadow-none border-border bg-card">
          <h3 className="text-base font-semibold text-foreground mb-1">Top targets</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Most-attacked destinations across all alerts
          </p>
          {targets.length ? (
            <ul className="space-y-1">
              {targets.map((t, i) => {
                const color = getAttackColor(t.attack_types[0] || "unknown");
                return (
                  <li key={t.dst_ip}>
                    <Link
                      href={`/alerts?dst_ip=${encodeURIComponent(t.dst_ip)}`}
                      title={`Filter alerts targeting ${t.dst_ip}`}
                      className="group flex items-center gap-3 text-xs py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
                    >
                      <span className="text-muted-foreground/70 font-mono w-4 shrink-0 tabular-nums">
                        {i + 1}.
                      </span>
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-foreground truncate">{t.dst_ip}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          Ports: {t.ports.slice(0, 5).join(", ")}
                          {t.ports.length > 5 ? " +" : ""}
                        </div>
                      </div>
                      <span className="tabular-nums font-semibold text-foreground shrink-0">
                        {t.count.toLocaleString()}
                      </span>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No attack data yet.</p>
          )}
        </Card>
      </div>

      {/* Severity breakdown table */}
      {severity?.labels?.length ? (
        <Card className="p-6 shadow-none border-border bg-card">
          <h3 className="text-base font-semibold text-foreground mb-1">Severity breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribution of alerts by tier</p>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-2.5">Severity</th>
                  <th className="px-4 py-2.5">Count</th>
                  <th className="px-4 py-2.5">Share</th>
                  <th className="px-4 py-2.5">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {severity.labels.map((label, i) => {
                  const value = severity.values[i];
                  const total = severity.values.reduce((a, b) => a + b, 0) || 1;
                  const pct = (value / total) * 100;
                  const color = severityColors[label] || "var(--muted-foreground)";
                  return (
                    <tr key={`${label}-${i}`} className="border-t border-border">
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                          style={{ backgroundColor: color }}
                        >
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                        {value.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-foreground tabular-nums">{pct.toFixed(1)}%</td>
                      <td className="px-4 py-3 w-1/2">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="p-5 shadow-none border-border bg-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div
          className="h-8 w-8 rounded-md grid place-items-center text-white"
          style={{ backgroundColor: color }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </div>
    </Card>
  );
}
