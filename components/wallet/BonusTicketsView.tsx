"use client";

import { Gift, Lock, Unlock, Clock } from "lucide-react";
import { formatUsdtFromCents } from "@/lib/utils/format";
import type { BonusTicket } from "@/types/bonus";

interface Props {
  tickets: BonusTicket[];
}

const statusIcon = (status: BonusTicket["status"]) => {
  if (status === "locked") return <Lock size={14} className="text-yellow-400" />;
  if (status === "released") return <Unlock size={14} className="text-up" />;
  return <Clock size={14} className="text-muted" />;
};

const statusLabel: Record<BonusTicket["status"], string> = {
  locked: "Locked",
  released: "Released",
  expired: "Expired",
};

const kindLabel: Record<BonusTicket["kind"], string> = {
  signup: "Signup Bonus",
  deposit: "Deposit Bonus",
  commission: "Referral Commission",
  gift: "Gift",
  admin: "Admin Credit",
};

export default function BonusTicketsView({ tickets }: Props) {
  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[20px] border border-border bg-surface-soft py-12 text-center">
        <Gift size={32} className="text-muted" />
        <p className="text-sm text-muted">No bonus tickets yet.</p>
        <p className="text-xs text-muted">
          Refer friends or complete trades to earn locked bonuses.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tickets.map((ticket) => {
        const progress =
          ticket.status === "locked"
            ? Math.min(
                (ticket.wagerProgressCents / ticket.wagerRequiredCents) * 100,
                100,
              )
            : 100;

        return (
          <div
            key={ticket.id}
            className="rounded-[20px] border border-border bg-surface-soft p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {statusIcon(ticket.status)}
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                    {kindLabel[ticket.kind]}
                  </span>
                </div>
                <p className="font-display text-2xl text-foreground">
                  {formatUsdtFromCents(ticket.amountCents)}
                </p>
                {ticket.note && (
                  <p className="text-xs text-muted">{ticket.note}</p>
                )}
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  ticket.status === "released"
                    ? "bg-up/15 text-up"
                    : ticket.status === "locked"
                      ? "bg-yellow-400/10 text-yellow-400"
                      : "bg-border text-muted"
                }`}
              >
                {statusLabel[ticket.status]}
              </span>
            </div>

            {ticket.status === "locked" && (
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Wager progress</span>
                  <span>
                    {formatUsdtFromCents(ticket.wagerProgressCents)} /{" "}
                    {formatUsdtFromCents(ticket.wagerRequiredCents)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted">
                  Expires{" "}
                  {new Date(ticket.expiresAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            )}

            {ticket.status === "released" && ticket.releasedAt && (
              <p className="mt-3 text-xs text-muted">
                Released{" "}
                {new Date(ticket.releasedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
