"use client";

import { useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type Row,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Skeleton } from "./Skeleton";

export type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  loading?: boolean;
  /** shown when not loading and data is empty */
  emptyState?: ReactNode;
  /** mobile (<lg) card renderer — falls back to a horizontally scrolling table */
  mobileCard?: (row: T) => ReactNode;
  getRowId?: (row: T) => string;
  className?: string;
  skeletonRows?: number;
};

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyState,
  mobileCard,
  getRowId,
  className,
  skeletonRows = 6,
}: DataTableProps<T>) {
  // TanStack Table returns functions the React Compiler can't memoize safely.
  "use no memo";

  const [sorting, setSorting] = useState<SortingState>([]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
  });

  if (loading) {
    return (
      <div className={cn("space-y-2", className)} aria-busy="true">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const rows = table.getRowModel().rows;

  return (
    <div className={className}>
      {/* Desktop table */}
      <div
        className={cn(
          "overflow-x-auto rounded-2xl border border-border",
          mobileCard ? "hidden lg:block" : "block",
        )}
      >
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : canSort
                              ? "none"
                              : undefined
                      }
                      className="bg-surface-strong/60 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 rounded transition-colors focus-ring hover:text-foreground"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sorted === "asc" ? (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ChevronsUpDown
                              className="h-3 w-3 opacity-40"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row: Row<T>) => (
              <tr
                key={row.id}
                className="border-b border-border last:border-0 transition-colors hover:bg-surface-strong/40"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle text-foreground">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card-collapse */}
      {mobileCard ? (
        <div className="space-y-3 lg:hidden">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              {mobileCard(row.original)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
