"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  ShieldAlert,
  Search,
  X,
  Clock,
  ArrowRight,
  Network,
  Target,
  Cpu,
  AlertTriangle,
  Gauge,
} from "lucide-react";

import { useDashboardData } from "@/hooks/useDashboardData";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { severityColors, getAttackColor, cyberPalette } from "@/lib/theme";
import { fetchAlertDetail, AlertResultFull } from "@/lib/api";

interface AlertResult {
  id: number | string;
  timestamp: string;
  prediction: string;
  severity: string;
  src_ip: string;
  dst_ip: string;
  dst_port: number;
  protocol: number;
  confidence: number;
  source_type: string;
  recommended_action?: string;
}

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NORMAL"] as const;

const protocolName = (p: number) => {
  const map: Record<number, string> = { 1: "ICMP", 6: "TCP", 17: "UDP", 50: "ESP", 51: "AH" };
  return map[p] || `Proto ${p}`;
};

export default function AlertsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AlertsPageInner />
    </Suspense>
  );
}

function AlertsPageInner() {
  const { alerts, loading, page, setPage, pageSize, setPageSize } = useDashboardData();
  const searchParams = useSearchParams();

  // Seed filters from URL once on mount (deep links from other pages).
  // We don't re-sync if the user changes filters interactively — URL stays out of date,
  // but state is the source of truth.
  const initialSearch =
    searchParams.get("search") ||
    searchParams.get("src_ip") ||
    searchParams.get("dst_ip") ||
    "";
  const initialSeverity = searchParams.get("severity")?.toUpperCase() || "ALL";
  const initialAttack = searchParams.get("prediction") || "ALL";

  const [search, setSearch] = useState(initialSearch);
  const [severityFilter, setSeverityFilter] = useState<string>(initialSeverity);
  const [attackFilter, setAttackFilter] = useState<string>(initialAttack);
  const [selected, setSelected] = useState<AlertResult | null>(null);

  // Unique attack types in current page (for filter dropdown) — trim to collapse
  // whitespace variants the ML pipeline may produce.
  const attackTypes = useMemo(() => {
    if (!alerts) return [];
    const set = new Set(alerts.results.map((a) => a.prediction.trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [alerts]);

  // Apply client-side filters to current page
  const filtered = useMemo(() => {
    if (!alerts) return [];
    return alerts.results.filter((a) => {
      if (severityFilter !== "ALL" && a.severity.toUpperCase() !== severityFilter) return false;
      if (attackFilter !== "ALL" && a.prediction !== attackFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !a.src_ip.toLowerCase().includes(q) &&
          !a.dst_ip.toLowerCase().includes(q) &&
          !a.prediction.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [alerts, severityFilter, attackFilter, search]);

  const clearFilters = () => {
    setSearch("");
    setSeverityFilter("ALL");
    setAttackFilter("ALL");
  };
  const hasFilters = search !== "" || severityFilter !== "ALL" || attackFilter !== "ALL";

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <header className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {alerts ? (
              <>
                <span className="text-foreground font-medium tabular-nums">
                  {alerts.count.toLocaleString()}
                </span>{" "}
                total alerts ingested · showing page {page} ({filtered.length} after filters)
              </>
            ) : (
              "Loading alerts feed…"
            )}
          </p>
        </div>
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters} className="h-8 gap-1.5">
            <X className="h-3.5 w-3.5" /> Clear filters
          </Button>
        )}
      </header>

      {/* Filter bar */}
      <Card className="p-4 shadow-none border-border bg-card">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search source IP, destination IP, or attack type…"
              className="pl-9"
            />
          </div>
          <div className="md:col-span-3">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All severities</SelectItem>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: severityColors[s] }}
                      />
                      {s}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Select value={attackFilter} onValueChange={setAttackFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All attack types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All attack types</SelectItem>
                {attackTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-1">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Alerts table */}
      <Card className="shadow-none border-border bg-card overflow-hidden">
        {loading && !alerts ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="h-10 text-xs font-medium text-muted-foreground bg-muted/40">
                  When
                </TableHead>
                <TableHead className="h-10 text-xs font-medium text-muted-foreground bg-muted/40">
                  Severity
                </TableHead>
                <TableHead className="h-10 text-xs font-medium text-muted-foreground bg-muted/40">
                  Attack
                </TableHead>
                <TableHead className="h-10 text-xs font-medium text-muted-foreground bg-muted/40">
                  Source → Destination
                </TableHead>
                <TableHead className="h-10 text-xs font-medium text-muted-foreground bg-muted/40">
                  Confidence
                </TableHead>
                <TableHead className="h-10 text-xs font-medium text-muted-foreground bg-muted/40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                    No alerts match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((alert) => {
                  const severity = alert.severity.toUpperCase();
                  const sColor = severityColors[severity] || cyberPalette.red;
                  const aColor = getAttackColor(alert.prediction);
                  return (
                    <TableRow
                      key={alert.id}
                      className="border-border hover:bg-accent/50 cursor-pointer"
                      onClick={() => setSelected(alert)}
                    >
                      <TableCell className="py-3">
                        <span className="text-xs text-muted-foreground">
                          {(() => {
                            try {
                              return formatDistanceToNow(new Date(alert.timestamp), {
                                addSuffix: true,
                              });
                            } catch {
                              return alert.timestamp;
                            }
                          })()}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                          style={{ backgroundColor: sColor }}
                        >
                          {severity}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: aColor }}
                          />
                          <span className="text-sm font-medium text-foreground">
                            {alert.prediction}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-mono text-xs text-foreground">
                          {alert.src_ip}
                          <ArrowRight className="inline h-3 w-3 mx-1.5 text-muted-foreground" />
                          {alert.dst_ip}:
                          <span className="text-muted-foreground">{alert.dst_port}</span>
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span
                          className="text-sm font-semibold tabular-nums"
                          style={{ color: sColor }}
                        >
                          {((alert.confidence || 0) * 100).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs font-medium"
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {alerts && alerts.count > pageSize && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground tabular-nums">
            Page {page} of {Math.ceil(alerts.count / pageSize)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(alerts.count / pageSize)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Alert detail dialog */}
      <AlertDetailDialog alert={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function AlertDetailDialog({
  alert,
  onClose,
}: {
  alert: AlertResult | null;
  onClose: () => void;
}) {
  const [full, setFull] = useState<AlertResultFull | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch the rich FlowRecord (with flow metrics) whenever an alert is opened
  useEffect(() => {
    if (!alert) {
      setFull(null);
      return;
    }
    setLoadingDetail(true);
    setFull(null);
    fetchAlertDetail(alert.id)
      .then((data) => setFull(data))
      .finally(() => setLoadingDetail(false));
  }, [alert]);

  if (!alert) return null;
  const severity = alert.severity.toUpperCase();
  const sColor = severityColors[severity] || cyberPalette.red;
  const aColor = getAttackColor(alert.prediction);

  let timeAbsolute = alert.timestamp;
  let timeRelative = "";
  try {
    timeAbsolute = format(new Date(alert.timestamp), "PPpp");
    timeRelative = formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true });
  } catch {
    /* ignore */
  }

  const fmtNum = (n?: number) =>
    n === undefined || n === null || Number.isNaN(n) ? "—" : n.toLocaleString();

  return (
    <Dialog open={!!alert} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-full text-white grid place-items-center shadow-sm"
              style={{ backgroundColor: sColor }}
            >
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold leading-tight">
                {alert.prediction}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: sColor }}
                >
                  {severity}
                </span>
                <span className="text-xs text-muted-foreground">
                  Alert <span className="font-mono">#{alert.id}</span>
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Time */}
          <DetailRow icon={Clock} label="Detected">
            <div className="text-sm text-foreground">{timeAbsolute}</div>
            {timeRelative && (
              <div className="text-xs text-muted-foreground mt-0.5">{timeRelative}</div>
            )}
          </DetailRow>

          {/* Network */}
          <DetailRow icon={Network} label="Network">
            <div className="flex items-center gap-2 flex-wrap text-sm font-mono">
              <span className="text-foreground">{alert.src_ip}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground">
                {alert.dst_ip}
                <span className="text-muted-foreground">:{alert.dst_port}</span>
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                ({protocolName(alert.protocol)})
              </span>
            </div>
          </DetailRow>

          {/* Attack classification */}
          <DetailRow icon={Target} label="Classification">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: aColor }}
              />
              <span className="text-sm font-medium text-foreground">{alert.prediction}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Source channel: <span className="text-foreground">{alert.source_type}</span>
            </div>
          </DetailRow>

          {/* Confidence */}
          <DetailRow icon={Cpu} label="Model confidence">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(alert.confidence || 0) * 100}%`,
                    backgroundColor: sColor,
                  }}
                />
              </div>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: sColor }}
              >
                {((alert.confidence || 0) * 100).toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Above the model&apos;s 80% threshold means high-confidence classification.
            </div>
          </DetailRow>

          {/* Flow metrics (from /api/alerts/<id>/) */}
          <DetailRow icon={Gauge} label="Flow telemetry">
            {loadingDetail ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : full ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <FlowMetric label="Duration" value={`${(full.flow_duration ?? 0).toFixed(2)}s`} />
                <FlowMetric
                  label="Bytes/sec"
                  value={fmtNum(Math.round(full.flow_bytes_per_sec ?? 0))}
                />
                <FlowMetric
                  label="Packets/sec"
                  value={fmtNum(Math.round(full.flow_packets_per_sec ?? 0))}
                />
                <FlowMetric label="Fwd packets" value={fmtNum(full.total_fwd_packets)} />
                <FlowMetric label="Bwd packets" value={fmtNum(full.total_bwd_packets)} />
                <FlowMetric
                  label="Registered ID"
                  value={full.registered_id || "—"}
                  mono
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Flow telemetry unavailable for this alert.
              </p>
            )}
          </DetailRow>

          {/* Recommended action */}
          {alert.recommended_action && (
            <DetailRow icon={AlertTriangle} label="Recommended action">
              <div className="text-sm text-foreground leading-relaxed bg-muted/40 border border-border rounded-md p-3">
                {alert.recommended_action}
              </div>
            </DetailRow>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FlowMetric({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`text-sm font-semibold tabular-nums text-foreground mt-0.5 truncate ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 shrink-0 rounded-md bg-muted grid place-items-center text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
          {label}
        </div>
        {children}
      </div>
    </div>
  );
}
