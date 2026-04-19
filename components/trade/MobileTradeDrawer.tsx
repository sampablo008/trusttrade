"use client";

import { useEffect, useRef } from "react";
import OrderTicket from "@/components/trade/OrderTicket";
import type { PublicToken, PublicTradePeriod } from "@/types/market";

interface MobileTradeDrawerProps {
  token: PublicToken;
  periods: PublicTradePeriod[];
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileTradeDrawer({
  token,
  periods,
  isOpen,
  onClose,
}: MobileTradeDrawerProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        aria-hidden="true"
        onClick={onClose}
        className={[
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Place trade"
        className={[
          "fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] border-t border-border bg-surface-soft",
          "transition-transform duration-300 ease-out lg:hidden",
          isOpen ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="max-h-[85dvh] overflow-y-auto p-4 pb-safe">
          <OrderTicket
            token={token}
            periods={periods}
            onTradeSuccess={onClose}
          />
        </div>
      </div>
    </>
  );
}
