"use client";

import { useState } from "react";
import TradeHistory from "@/components/admin/trade-history";
import TradeQueue from "@/components/admin/trade-queue";
import type { AdminTrade } from "@/types/admin";

interface Props {
  initialTrades: AdminTrade[];
}

type Tab = "queue" | "history";

export default function TradeAdminPanel({ initialTrades }: Props) {
  const [tab, setTab] = useState<Tab>("queue");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-1 self-start rounded-full border border-border bg-background/30 p-1">
        {(["queue", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              tab === t
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t === "queue" ? "Queue" : "History"}
          </button>
        ))}
      </div>

      <div hidden={tab !== "queue"}>
        <TradeQueue initialTrades={initialTrades} />
      </div>
      {tab === "history" && <TradeHistory />}
    </div>
  );
}
