"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useOverlay } from "./use-overlay";

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** bottom sheet (mobile) or right side panel (desktop forms) */
  side?: "bottom" | "right";
  dismissible?: boolean;
  className?: string;
};

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "bottom",
  dismissible = true,
  className,
}: DrawerProps) {
  const titleId = useId();
  const panelRef = useOverlay({ open, onClose, closeOnEsc: dismissible });

  // Keep panel mounted for one frame to animate the enter transition.
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- portal SSR guard
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setShown(true));
    return () => {
      cancelAnimationFrame(raf);
      setShown(false);
    };
  }, [open]);

  if (!mounted || !open) return null;

  const isBottom = side === "bottom";

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: "var(--z-drawer)" }}>
      <div
        aria-hidden="true"
        onClick={dismissible ? onClose : undefined}
        className={cn(
          "absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-200",
          shown ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          "absolute border-border bg-surface shadow-deep outline-none transition-transform duration-300 ease-out-expo",
          isBottom
            ? cn(
                "inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)]",
                shown ? "translate-y-0" : "translate-y-full",
              )
            : cn(
                "inset-y-0 right-0 w-full max-w-md overflow-y-auto border-l",
                shown ? "translate-x-0" : "translate-x-full",
              ),
          className,
        )}
      >
        {isBottom ? (
          <div className="flex justify-center pt-3" aria-hidden="true">
            <span className="h-1.5 w-10 rounded-full bg-border" />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          {title ? (
            <h2
              id={titleId}
              className="font-display text-base font-semibold text-foreground"
            >
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded-full p-2 text-muted transition-colors focus-ring hover:bg-background/40 hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
