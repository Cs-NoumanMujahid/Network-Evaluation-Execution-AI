"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Activity } from "lucide-react";

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
    <div className="flex flex-col sm:flex-row gap-6 items-center justify-between">
      <div className="flex flex-wrap gap-4 items-center">
        <span className="font-medium text-sm text-muted-foreground mr-2 uppercase tracking-tighter">System Pipeline:</span>
        {services.map((service) => (
          <Badge
            key={service.key}
            variant={service.status ? "default" : "destructive"}
            className={`flex items-center gap-1.5 px-3 py-1 border-none ${service.status ? "bg-cyber-teal/20 text-cyber-teal animate-pulse-slow" : "bg-cyber-red/20 text-cyber-red"}`}
          >
            {service.status ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            <span className="text-[10px] font-bold uppercase tracking-wide">{service.name}</span>
          </Badge>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyber-blue" />
          <div className="text-sm">
            <span className="font-bold tabular-nums">{data.flows_per_minute || 0}</span>
            <span className="text-[10px] text-muted-foreground ml-1 uppercase font-semibold">flows/min</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyber-red" />
          <div className="text-sm">
            <span className="font-bold tabular-nums">{data.alerts_per_minute || 0}</span>
            <span className="text-[10px] text-muted-foreground ml-1 uppercase font-semibold">alerts/min</span>
          </div>
        </div>
      </div>
    </div>
  );
}
