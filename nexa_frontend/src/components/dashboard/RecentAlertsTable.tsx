"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/table/DataTablePagination";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { severityColors, getAttackColor } from "@/lib/theme";

interface AlertData {
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

interface RecentAlertsTableProps {
  data: {
    count: number;
    results: AlertData[];
  } | null;
  loading: boolean;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
}

export default function RecentAlertsTable({ data, loading, page, setPage, pageSize, setPageSize }: RecentAlertsTableProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const columns: ColumnDef<AlertData>[] = [
    {
      accessorKey: "timestamp",
      header: "Time",
      cell: ({ row }) => {
        try {
          return (
            <span className="text-[10px] font-medium text-muted-foreground uppercase">
              {formatDistanceToNow(new Date(row.original.timestamp), { addSuffix: true })}
            </span>
          );
        } catch {
          return row.original.timestamp;
        }
      },
    },
    {
      accessorKey: "prediction",
      header: "Attack Type",
      cell: ({ row }) => {
        const color = getAttackColor(row.original.prediction);
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-bold text-sm tracking-tight">{row.original.prediction}</span>
          </div>
        );
      }
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => {
        const severity = row.original.severity;
        const color = severityColors[severity] || "var(--color-muted-foreground)";
        return (
          <Badge
            variant="outline"
            className="border-none font-black text-[9px] px-2 py-0.5 uppercase tracking-tighter"
            style={{ backgroundColor: `${color}20`, color: color }}
          >
            {severity}
          </Badge>
        );
      },
    },
    {
      accessorKey: "src_ip",
      header: "Source IP",
      cell: ({ row }) => <span className="font-mono text-xs font-semibold">{row.original.src_ip}</span>
    },
    {
      accessorKey: "dst_ip",
      header: "Dest IP",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.dst_ip}:{row.original.dst_port}</span>
    },
    {
      accessorKey: "confidence",
      header: "Confidence",
      cell: ({ row }) => (
        <span className="tabular-nums font-bold text-sm">
          {((row.original.confidence || 0) * 100).toFixed(1)}%
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const action = row.original.recommended_action;
        return (
          <Button
            variant="ghost"
            size="sm"
            disabled={!action}
            onClick={() => setSelectedAction(action || null)}
            className="h-7 text-[10px] font-bold uppercase tracking-widest hover:bg-cyber-blue/10 hover:text-cyber-blue transition-all active:scale-95 border border-border/50"
          >
            View Action
          </Button>
        );
      },
    },
  ];

  const table = useReactTable({
    data: data?.results || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data ? Math.ceil(data.count / pageSize) : -1,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize: pageSize,
      },
    },
    onPaginationChange: (updater) => {
      if (typeof updater === "function") {
        const nextState = updater({ pageIndex: page - 1, pageSize: pageSize });
        if (nextState.pageIndex !== page - 1) {
          setPage(nextState.pageIndex + 1);
        }
        if (nextState.pageSize !== pageSize) {
          setPageSize(nextState.pageSize);
        }
      }
    },
  });

  if (loading && !data) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-cyber-red animate-pulse-slow" />
          Recent Threats
        </h2>
        {data && (
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
            Total Events: <span className="text-foreground font-bold tabular-nums">{data.count}</span>
          </span>
        )}
      </div>
      <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden transition-all duration-500 shadow-sm border-border/40">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground py-4">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-accent/50 transition-colors border-border/20"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground font-medium">
                  Scanning for network anomalies...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.results.length > 0 && (
        <DataTablePagination table={table} />
      )}

      <Dialog open={!!selectedAction} onOpenChange={(open) => !open && setSelectedAction(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-cyber-blue/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ShieldAlert className="h-5 w-5 text-cyber-blue" />
              Strategic Response
            </DialogTitle>
            <DialogDescription className="pt-6 text-sm text-foreground leading-relaxed border-t border-border/50 mt-4">
              {selectedAction}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { ShieldAlert } from "lucide-react";
