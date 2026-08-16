"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Clock,
  Crosshair,
  Activity,
} from "lucide-react";

import { useDashboardData } from "@/hooks/useDashboardData";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAttackColor, severityColors } from "@/lib/theme";
import { fetchAlertsBySource, AlertResultLite } from "@/lib/api";

const statusColors: Record<string, string> = {
  open: "var(--color-status-critical)",
  acknowledged: "var(--color-status-medium)",
  resolved: "var(--color-status-low)",
};

const statusLabel: Record<string, string> = {
  open: "Active",
  acknowledged: "Investigating",
  resolved: "Resolved",
};

export default function IncidentsPage() {
  const { topAttackers, loading } = useDashboardData();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [relatedAlerts, setRelatedAlerts] = useState<Record<string, AlertResultLite[]>>({});
  const [loadingIp, setLoadingIp] = useState<string | null>(null);

  const incidents = topAttackers?.attackers || [];

  // Fetch related alerts when an incident is expanded
  useEffect(() => {
    if (!expanded) return;
    if (relatedAlerts[expanded]) return; // already fetched
    setLoadingIp(expanded);
    fetchAlertsBySource(expanded, 20)
      .then((results) => {
        setRelatedAlerts((prev) => ({ ...prev, [expanded]: results }));
      })
      .finally(() => setLoadingIp((cur) => (cur === expanded ? null : cur)));
  }, [expanded, relatedAlerts]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Incidents</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Attack sources grouped by IP, showing what they triggered and how.
        </p>
      </header>

      {loading && !topAttackers ? (
        <div className="grid grid-cols-1 gap-3">
          <Skeleton className="h-32 w-full rounded-[var(--radius)]" />
          <Skeleton className="h-32 w-full rounded-[var(--radius)]" />
          <Skeleton className="h-32 w-full rounded-[var(--radius)]" />
        </div>
      ) : incidents.length === 0 ? (
        <Card className="p-12 shadow-none border-border bg-card text-center">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">No active incidents</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Network is currently quiet. Incidents appear here when attack sources are detected.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {incidents.map((inc) => {
            const status = inc.status || 'open';
            const primaryAttack = inc.attack_types[0] || "Unknown";
            const color = getAttackColor(primaryAttack);
            const isOpen = expanded === inc.src_ip;
            const related = relatedAlerts[inc.src_ip] || [];
            const isLoadingRelated = isOpen && loadingIp === inc.src_ip && related.length === 0;

            return (
              <Card
                key={inc.src_ip}
                className="p-5 shadow-none border-border bg-card cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => setExpanded(isOpen ? null : inc.src_ip)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="h-12 w-12 rounded-full text-white grid place-items-center shadow-sm"
                    style={{ backgroundColor: color }}
                  >
                    <Crosshair className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-base font-semibold text-foreground font-mono">
                        {inc.src_ip}
                      </h3>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: statusColors[status] || statusColors['open'] }}
                      >
                        {statusLabel[status] || status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {Array.from(new Set(inc.attack_types.map((t) => t.trim()))).map((t) => (
                        <span
                          key={`${inc.src_ip}-${t}`}
                          className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            borderColor: getAttackColor(t),
                            color: getAttackColor(t),
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: getAttackColor(t) }}
                          />
                          {t}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      <span className="text-foreground font-semibold tabular-nums">
                        {inc.count.toLocaleString()}
                      </span>{" "}
                      alerts from this source
                    </p>
                  </div>

                  <div className="shrink-0 text-muted-foreground">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Expanded: related alerts */}
                {isOpen && (
                  <div
                    className="mt-4 pt-4 border-t border-border space-y-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                      Recent alerts from {inc.src_ip}
                    </div>
                    {isLoadingRelated ? (
                      <div className="space-y-2">
                        <Skeleton className="h-7 w-full" />
                        <Skeleton className="h-7 w-full" />
                        <Skeleton className="h-7 w-3/4" />
                      </div>
                    ) : related.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No individual alerts found for this source.
                      </p>
                    ) : (
                      related.map((a) => {
                        const sev = a.severity.toUpperCase();
                        const sColor = severityColors[sev] || color;
                        let when = "";
                        try {
                          when = formatDistanceToNow(new Date(a.timestamp), { addSuffix: true });
                        } catch {
                          when = a.timestamp;
                        }
                        return (
                          <div
                            key={a.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/40 text-xs"
                          >
                            <span
                              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shrink-0"
                              style={{ backgroundColor: sColor }}
                            >
                              {sev}
                            </span>
                            <ShieldAlert
                              className="h-3.5 w-3.5 shrink-0"
                              style={{ color: getAttackColor(a.prediction) }}
                            />
                            <span className="font-medium text-foreground truncate w-32">
                              {a.prediction}
                            </span>
                            <span className="font-mono text-muted-foreground truncate">
                              {a.src_ip}
                              <ArrowRight className="inline h-3 w-3 mx-1" />
                              {a.dst_ip}:{a.dst_port}
                            </span>
                            <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground shrink-0">
                              <Clock className="h-3 w-3" /> {when}
                            </span>
                            <span
                              className="font-semibold tabular-nums shrink-0"
                              style={{ color: sColor }}
                            >
                              {(a.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
