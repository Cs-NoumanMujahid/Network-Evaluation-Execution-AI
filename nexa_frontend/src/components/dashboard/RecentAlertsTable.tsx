"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ShieldAlert } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export default function RecentAlertsTable({
  data,
  loading,
  page,
  setPage,
  pageSize,
  setPageSize,
}: RecentAlertsTableProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const columns: ColumnDef<AlertData>[] = [
    {
      accessorKey: "timestamp",
      header: "Time",
      cell: ({ row }) => {
        try {
          return (
            <span className="text-xs text-muted-foreground">
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
      header: "Attack type",
      cell: ({ row }) => {
        const color = getAttackColor(row.original.prediction);
        return (
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span className="text-sm font-medium text-foreground">{row.original.prediction}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "severity",
      header: "Severity",
      cell: ({ row }) => {
        const severity = row.original.severity;
        const color = severityColors[severity] || "var(--muted-foreground)";
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
            style={{
              borderColor: color,
              color: color,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
            {severity}
          </span>
        );
      },
    },
    {
      accessorKey: "src_ip",
      header: "Source",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-foreground">{row.original.src_ip}</span>
      ),
    },
    {
      accessorKey: "dst_ip",
      header: "Destination",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.dst_ip}
          <span className="text-muted-foreground/60">:{row.original.dst_port}</span>
        </span>
      ),
    },
    {
      accessorKey: "confidence",
      header: "Confidence",
      cell: ({ row }) => (
        <span className="tabular-nums text-sm font-medium text-foreground">
          {((row.original.confidence || 0) * 100).toFixed(1)}%
        </span>
      ),
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
    return <Skeleton className="h-96 w-full rounded-md" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Recent alerts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Latest detections across all monitored sources.
          </p>
        </div>
        {data && (
          <span className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{data.count.toLocaleString()}</span> total
          </span>
        )}
      </div>

      <div className="rounded-md border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-border">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 text-xs font-medium text-muted-foreground bg-muted/40"
                  >
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
                  className="border-border hover:bg-accent/50"
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
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  No alerts yet — scanning for anomalies.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.results.length > 0 && <DataTablePagination table={table} />}

      <Dialog open={!!selectedAction} onOpenChange={(open) => !open && setSelectedAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <ShieldAlert className="h-4 w-4 text-status-info" />
              Recommended action
            </DialogTitle>
            <DialogDescription className="pt-3 text-sm leading-relaxed text-foreground border-t border-border mt-3">
              {selectedAction}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
