"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, X } from "lucide-react";
import { adminNav } from "./nav-config";

type Props = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

export default function AdminSidebar({ mobileOpen, onCloseMobile }: Props) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface/95 backdrop-blur transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-foreground"
            onClick={onCloseMobile}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand/15 text-brand">
              <ShieldCheck size={15} />
            </span>
            TrustPro <span className="text-muted">/ admin</span>
          </Link>
          <button
            type="button"
            aria-label="Close navigation"
            className="rounded-md p-1.5 text-muted transition hover:bg-surface-strong hover:text-foreground lg:hidden"
            onClick={onCloseMobile}
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {adminNav.map((section) => (
            <div key={section.label} className="mb-5 last:mb-0">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/80">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onCloseMobile}
                        className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition ${
                          active
                            ? "bg-brand/10 text-brand"
                            : "text-muted hover:bg-surface-strong hover:text-foreground"
                        }`}
                      >
                        {active ? (
                          <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-brand" />
                        ) : null}
                        <Icon
                          size={15}
                          className={active ? "text-brand" : "text-muted group-hover:text-foreground"}
                        />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border px-4 py-3 text-[11px] text-muted">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-up" />
            All systems nominal
          </div>
        </div>
      </aside>
    </>
  );
}
