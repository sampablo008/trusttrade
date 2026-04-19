"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { AlertTriangle, Clock3, ShieldAlert } from "lucide-react";
import { queueFilters, settlementRows } from "@/lib/constants/platform";
import { formatUsdFromCents } from "@/lib/utils/format";
import { useTradingShellStore } from "@/stores/trading-shell-store";
import type { SettlementRow } from "@/types/platform";

const columns: ColumnDef<SettlementRow>[] = [
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => (
      <div>
        <p className="font-semibold text-foreground">{row.original.user}</p>
        <p className="text-xs uppercase tracking-[0.22em] text-muted">{row.original.id}</p>
      </div>
    ),
  },
  {
    accessorKey: "pair",
    header: "Pair",
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium text-foreground">{row.original.pair}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-muted">{row.original.direction}</p>
      </div>
    ),
  },
  {
    accessorKey: "stakeCents",
    header: "Stake",
    cell: ({ row }) => (
      <p className="text-sm font-semibold text-foreground">
        {formatUsdFromCents(row.original.stakeCents)}
      </p>
    ),
  },
  {
    accessorKey: "expiresIn",
    header: "Time left",
    cell: ({ row }) => (
      <div className="inline-flex items-center gap-2 rounded-full bg-background/50 px-3 py-1 text-xs font-semibold text-warning">
        <Clock3 size={14} />
        {row.original.expiresIn}
      </div>
    ),
  },
  {
    accessorKey: "flag",
    header: "Flag",
    cell: ({ row }) => {
      const flag = row.original.flag;

      return flag === "NONE" ? (
        <span className="text-xs uppercase tracking-[0.22em] text-muted">Clear</span>
      ) : (
        <div className="inline-flex items-center gap-2 rounded-full bg-down/10 px-3 py-1 text-xs font-semibold text-down">
          <ShieldAlert size={14} />
          {flag}
        </div>
      );
    },
  },
];

export default function SettlementQueueTable() {
  "use no memo";

  const { queueView, selectedToken, setQueueView } = useTradingShellStore();

  const filteredRows = settlementRows.filter((row) => {
    const matchesToken = row.token === selectedToken;

    if (queueView === "all") {
      return matchesToken;
    }

    return matchesToken && row.status === queueView;
  });

  // TanStack Table manages function-heavy table state internally, so this island opts out.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-[36px] border border-border bg-surface-soft p-6">
      <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-warning">
            <AlertTriangle size={14} />
            Admin settlement queue
          </div>
          <div>
            <h3 className="font-display text-3xl text-foreground">
              TanStack table, Zustand-driven filters
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              First table surface uses TanStack Table. Filter state lives in Zustand and reacts to
              the active market above.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {queueFilters.map((filter) => {
            const isActive = filter.value === queueView;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setQueueView(filter.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-brand bg-brand text-background"
                    : "border-border bg-background/35 text-foreground"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[28px] border border-border">
        <table className="min-w-full divide-y divide-border text-left">
          <thead className="bg-background/55">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-background/30">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-4 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRows.length === 0 ? (
          <div className="border-t border-border bg-surface px-4 py-6 text-sm text-muted">
            No rows match this token and queue filter yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
