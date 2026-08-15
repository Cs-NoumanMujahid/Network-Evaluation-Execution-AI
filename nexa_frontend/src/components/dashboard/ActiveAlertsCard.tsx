"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { severityColors, cyberPalette } from "@/lib/theme";

interface AlertResult {
  id: number | string;
  timestamp: string;
  prediction: string;
  severity: string;
  src_ip: string;
  dst_ip: string;
  dst_port: number;
  confidence: number;
}

interface ActiveAlertsCardProps {
  data: { count: number; results: AlertResult[] } | null;
  loading: boolean;
}

export default function ActiveAlertsCard({ data, loading }: ActiveAlertsCardProps) {
  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
        <Skeleton className="h-[260px] rounded-[var(--radius)]" />
        <Skeleton className="h-[260px] rounded-[var(--radius)]" />
        <Skeleton className="h-[260px] rounded-[var(--radius)]" />
      </div>
    );
  }

  const alerts = data?.results.slice(0, 2) || [];

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-semibold text-foreground">
          Active alerts <span className="text-muted-foreground font-normal">({alerts.length})</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {alerts.map((alert) => (
          <AlertTile key={alert.id} alert={alert} />
        ))}
        {Array.from({ length: Math.max(0, 2 - alerts.length) }).map((_, i) => (
          <AlertTile key={`empty-${i}`} alert={null} />
        ))}
      </div>
    </div>
  );
}

function AlertTile({ alert }: { alert: AlertResult | null }) {
  if (!alert) {
    return (
      <Card className="p-5 shadow-none border-border bg-card flex flex-col justify-between min-h-[200px]">
        <div className="h-10 w-10 rounded-full bg-muted grid place-items-center text-muted-foreground">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">No active alerts</p>
          <p className="text-[11px] text-muted-foreground/70">Network is quiet</p>
        </div>
      </Card>
    );
  }

  const severity = alert.severity.toUpperCase();
  const severityColor = severityColors[severity] || cyberPalette.red;
  const isDanger = severity === "CRITICAL" || severity === "HIGH";
  const tintPct = severity === "CRITICAL" ? 9 : severity === "HIGH" ? 5 : 0;

  return (
    <Card
      className="p-5 shadow-none border-border flex flex-col justify-between min-h-[200px] relative overflow-hidden"
      style={{
        backgroundColor: isDanger
          ? `color-mix(in srgb, ${severityColor} ${tintPct}%, var(--card))`
          : "var(--card)",
      }}
    >
      {isDanger && (
        <AlertTriangle
          className="absolute -bottom-8 -right-8 h-44 w-44 pointer-events-none"
          strokeWidth={1.5}
          style={{ color: severityColor, opacity: severity === "CRITICAL" ? 0.13 : 0.1 }}
          aria-hidden
        />
      )}
      <div className="flex items-start justify-between relative z-10">
        <div
          className="h-10 w-10 rounded-full text-white grid place-items-center shadow-sm"
          style={{ backgroundColor: severityColor }}
        >
          <ShieldAlert className="h-4 w-4" />
        </div>
      </div>

      <div className="space-y-2 relative z-10">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: severityColor }}
        >
          {severity}
        </span>
        <h4 className="text-base font-semibold text-foreground leading-tight">
          {alert.prediction}
        </h4>
        <p className="text-xs text-muted-foreground font-mono truncate">
          {alert.src_ip} → {alert.dst_ip}:{alert.dst_port}
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border relative z-10">
        <span className="text-[11px] text-muted-foreground">
          {(() => {
            try { return formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true }); } catch { return "—"; }
          })()}
        </span>
        <span
          className="text-[11px] font-bold tabular-nums"
          style={{ color: severityColor }}
        >
          {((alert.confidence || 0) * 100).toFixed(0)}%
        </span>
      </div>
    </Card>
  );
}

