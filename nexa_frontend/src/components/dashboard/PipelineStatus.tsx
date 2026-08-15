"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertTriangle } from "lucide-react";

interface PipelineStatusProps {
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

export default function PipelineStatus({ data, loading }: PipelineStatusProps) {
  if (loading && !data) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (!data) return null;

  const services = [
    { key: "kafka", name: "Kafka", status: data.kafka?.status },
    { key: "cicflowmeter", name: "CICFlowMeter", status: data.cicflowmeter?.status },
    { key: "ml_consumer", name: "ML Consumer", status: data.ml_consumer?.status },
    { key: "tcpdump", name: "TCPDump", status: data.tcpdump?.status },
  ];

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Pipeline</span>
        {services.map((service) => (
          <span
            key={service.key}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                service.status
                  ? "bg-status-low"
                  : "bg-status-critical"
              }`}
              aria-hidden
            />
            {service.name}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-6">
        <Metric
          icon={<Activity className="h-3.5 w-3.5 text-status-info" />}
          value={data.flows_per_minute || 0}
          label="flows / min"
        />
        <Metric
          icon={<AlertTriangle className="h-3.5 w-3.5 text-status-critical" />}
          value={data.alerts_per_minute || 0}
          label="alerts / min"
        />
      </div>
    </div>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
