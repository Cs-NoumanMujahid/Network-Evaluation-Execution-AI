"use client";

import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Radio,
  FileSearch,
  Workflow,
  Brain,
  TrendingUp,
  Gauge,
  AlertCircle,
} from "lucide-react";

import { useDashboardData } from "@/hooks/useDashboardData";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import TrafficVolumeChart from "@/components/dashboard/TrafficVolumeChart";

interface PipelineStage {
  key: string;
  name: string;
  role: string;
  icon: React.ElementType;
  status: boolean;
  lastSeen?: string;
}

export default function SystemHealthPage() {
  const { pipelineStatus, trafficVolume, alerts, loading } = useDashboardData();

  const stages: PipelineStage[] = useMemo(
    () => [
      {
        key: "tcpdump",
        name: "Packet capture",
        role: "tcpdump → /pcaps",
        icon: Radio,
        status: !!pipelineStatus?.tcpdump?.status,
        lastSeen: pipelineStatus?.tcpdump?.last_seen,
      },
      {
        key: "cicflowmeter",
        name: "Flow extraction",
        role: "CICFlowMeter → /flows",
        icon: FileSearch,
        status: !!pipelineStatus?.cicflowmeter?.status,
        lastSeen: pipelineStatus?.cicflowmeter?.last_seen,
      },
      {
        key: "kafka",
        name: "Message broker",
        role: "Kafka → topic: flows",
        icon: Workflow,
        status: !!pipelineStatus?.kafka?.status,
        lastSeen: pipelineStatus?.kafka?.last_seen,
      },
      {
        key: "ml_consumer",
        name: "ML classification",
        role: "CNN model · threshold 0.80",
        icon: Brain,
        status: !!pipelineStatus?.ml_consumer?.status,
        lastSeen: pipelineStatus?.ml_consumer?.last_seen,
      },
    ],
    [pipelineStatus],
  );

  // Compute average confidence of recent alerts on the current page
  const avgConfidence = useMemo(() => {
    if (!alerts?.results || alerts.results.length === 0) return null;
    const sum = alerts.results.reduce((s, a) => s + (a.confidence || 0), 0);
    return (sum / alerts.results.length) * 100;
  }, [alerts]);

  const okCount = stages.filter((s) => s.status).length;
  const overallHealthy = okCount === stages.length;

  if (loading && !pipelineStatus) {
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
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">System health</h1>
        <p className="text-sm text-muted-foreground mt-1">
          End-to-end view of the detection pipeline. {okCount}/{stages.length} stages reporting.
        </p>
      </header>

      {/* Health banner */}
      <Card
        className="p-5 shadow-none border-border bg-card flex items-center gap-4"
        style={{
          backgroundColor: overallHealthy
            ? "color-mix(in srgb, var(--color-status-low) 6%, var(--card))"
            : "color-mix(in srgb, var(--color-status-critical) 6%, var(--card))",
        }}
      >
        <div
          className="h-12 w-12 rounded-full grid place-items-center text-white shadow-sm"
          style={{
            backgroundColor: overallHealthy
              ? "var(--color-status-low)"
              : "var(--color-status-critical)",
          }}
        >
          {overallHealthy ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <AlertCircle className="h-6 w-6" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-foreground">
            {overallHealthy ? "All systems operational" : "Pipeline degraded"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {overallHealthy
              ? "Data is flowing end-to-end. Ingest, processing, and classification stages are reachable."
              : `${stages.length - okCount} stage(s) not reporting. Check container logs.`}
          </p>
        </div>
      </Card>

      {/* Throughput cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ThroughputTile
          icon={TrendingUp}
          label="Flow ingest"
          value={pipelineStatus?.flows_per_minute || 0}
          unit="flows / min"
          color="var(--color-status-info)"
        />
        <ThroughputTile
          icon={AlertCircle}
          label="Alert rate"
          value={pipelineStatus?.alerts_per_minute || 0}
          unit="alerts / min"
          color="var(--color-status-critical)"
        />
        <ThroughputTile
          icon={Gauge}
          label="Model confidence"
          value={avgConfidence ?? 0}
          unit="% avg (current page)"
          color="var(--color-status-medium)"
          isPercent
        />
      </div>

      {/* Pipeline flow visualization */}
      <Card className="p-6 shadow-none border-border bg-card">
        <h3 className="text-base font-semibold text-foreground mb-1">Pipeline flow</h3>
        <p className="text-xs text-muted-foreground mb-5">
          Visualisation of how packets become alerts. Each stage runs in its own container.
        </p>

        <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
          {stages.map((s, i) => (
            <div key={s.key} className="flex items-stretch gap-2 flex-1 min-w-[180px]">
              <div className="flex-1 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div
                    className="h-9 w-9 rounded-md grid place-items-center text-white shrink-0"
                    style={{
                      backgroundColor: s.status
                        ? "var(--color-status-low)"
                        : "var(--color-status-critical)",
                    }}
                  >
                    <s.icon className="h-4 w-4" />
                  </div>
                  {s.status ? (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--color-status-low)" }}
                    />
                  ) : (
                    <XCircle
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--color-status-critical)" }}
                    />
                  )}
                </div>
                <div className="text-sm font-semibold text-foreground leading-tight">{s.name}</div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-snug font-mono">
                  {s.role}
                </div>
                {s.lastSeen && (
                  <div className="text-[10px] text-muted-foreground/70 mt-2">
                    Last seen{" "}
                    {(() => {
                      try {
                        return formatDistanceToNow(new Date(s.lastSeen!), { addSuffix: true });
                      } catch {
                        return "—";
                      }
                    })()}
                  </div>
                )}
              </div>
              {i < stages.length - 1 && (
                <div className="grid place-items-center text-muted-foreground shrink-0">
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Throughput chart */}
      <Card className="p-6 shadow-none border-border bg-card">
        <TrafficVolumeChart data={trafficVolume} loading={loading} />
      </Card>

      {/* Detailed service table */}
      <Card className="p-6 shadow-none border-border bg-card">
        <h3 className="text-base font-semibold text-foreground mb-4">Service detail</h3>
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2.5">Service</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s, i) => (
                <tr
                  key={s.key}
                  className={`border-t border-border ${i % 2 ? "bg-muted/10" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase text-white"
                      style={{
                        backgroundColor: s.status
                          ? "var(--color-status-low)"
                          : "var(--color-status-critical)",
                      }}
                    >
                      {s.status ? "Up" : "Down"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{s.role}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {s.lastSeen
                      ? (() => {
                          try {
                            return formatDistanceToNow(new Date(s.lastSeen!), {
                              addSuffix: true,
                            });
                          } catch {
                            return "—";
                          }
                        })()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ThroughputTile({
  icon: Icon,
  label,
  value,
  unit,
  color,
  isPercent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  unit: string;
  color: string;
  isPercent?: boolean;
}) {
  return (
    <Card className="p-5 shadow-none border-border bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div
          className="h-8 w-8 rounded-md grid place-items-center text-white"
          style={{ backgroundColor: color }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-3xl font-semibold tabular-nums tracking-tight" style={{ color }}>
        {isPercent ? value.toFixed(1) : value.toLocaleString()}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1">{unit}</div>
    </Card>
  );
}
