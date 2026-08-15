"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PipelineGoalsCardProps {
  data: {
    kafka?: { status: boolean };
    cicflowmeter?: { status: boolean };
    ml_consumer?: { status: boolean };
    tcpdump?: { status: boolean };
    flows_per_minute?: number;
    alerts_per_minute?: number;
  } | null;
  loading: boolean;
}

export default function PipelineGoalsCard({ data, loading }: PipelineGoalsCardProps) {
  if (loading && !data) {
    return <Skeleton className="h-[280px] w-full rounded-[var(--radius)]" />;
  }

  if (!data) return null;

  const services = [
    { name: "Kafka stream",     ok: !!data.kafka?.status,        desc: "Message broker" },
    { name: "CICFlowMeter",     ok: !!data.cicflowmeter?.status, desc: "Flow extraction" },
    { name: "ML consumer",      ok: !!data.ml_consumer?.status,  desc: "Classification" },
    { name: "Packet capture",   ok: !!data.tcpdump?.status,      desc: "tcpdump sniffer" },
  ];

  const okCount = services.filter((s) => s.ok).length;

  return (
    <Card className="p-6 shadow-none border-border bg-card h-full flex flex-col">
      <header className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-foreground">Pipeline status</h3>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium tabular-nums text-foreground">
            {okCount}/{services.length}
          </span>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <div className="text-lg font-semibold tabular-nums text-foreground">
            {(data.flows_per_minute || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">flows / min</div>
        </div>
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <div
            className="text-lg font-semibold tabular-nums"
            style={{ color: "var(--color-status-critical)" }}
          >
            {(data.alerts_per_minute || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">alerts / min</div>
        </div>
      </div>

      <ul className="space-y-3 flex-1">
        {services.map((s) => (
          <li key={s.name} className="flex items-center gap-3">
            <span
              className="shrink-0 h-5 w-5 rounded-full grid place-items-center border"
              style={
                s.ok
                  ? { backgroundColor: "var(--color-status-low)", borderColor: "var(--color-status-low)" }
                  : { backgroundColor: "var(--card)", borderColor: "var(--color-status-critical)" }
              }
            >
              {s.ok ? (
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 4" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                  <path d="M3.5 3.5L8.5 8.5M8.5 3.5L3.5 8.5" stroke="var(--color-status-critical)" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${s.ok ? "text-foreground" : "text-muted-foreground"}`}>
                {s.name}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{s.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
