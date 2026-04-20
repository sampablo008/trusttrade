"use client";

import { useEffect } from "react";

interface SideDrawerProps {
  ariaLabel?: string;
  children: React.ReactNode;
  eyebrow?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  widthClass?: string;
}

export default function SideDrawer({
  ariaLabel,
  children,
  eyebrow,
  isOpen,
  onClose,
  title,
  widthClass = "w-full sm:max-w-md",
}: SideDrawerProps) {
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        className={[
          "fixed inset-y-0 right-0 z-50 flex flex-col border-l border-border bg-surface-soft",
          "transition-transform duration-300 ease-out",
          widthClass,
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
          <div>
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                {eyebrow}
              </p>
            )}
            <h2 className="mt-1 text-lg font-semibold text-foreground">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="rounded-full border border-border bg-background/30 px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-brand hover:text-foreground"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </>
  );
}
