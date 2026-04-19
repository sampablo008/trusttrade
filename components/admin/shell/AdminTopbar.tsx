"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut, Menu } from "lucide-react";
import { signOutPreview } from "@/app/actions/auth";
import { allAdminItems } from "./nav-config";

type Props = {
  username: string | null;
  onOpenMobile: () => void;
};

export default function AdminTopbar({ username, onOpenMobile }: Props) {
  const pathname = usePathname();
  const crumbs = buildBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onOpenMobile}
        className="rounded-md p-1.5 text-muted transition hover:bg-surface hover:text-foreground lg:hidden"
      >
        <Menu size={18} />
      </button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <div key={crumb.href} className="flex min-w-0 items-center gap-1.5">
            {i > 0 ? <ChevronRight size={13} className="shrink-0 text-muted/60" /> : null}
            {i === crumbs.length - 1 ? (
              <span className="truncate font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="truncate text-muted transition hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {username ? (
          <div className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs sm:flex">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20 text-[10px] font-semibold uppercase text-brand">
              {username.slice(0, 2)}
            </span>
            <span className="font-medium text-foreground">{username}</span>
            <span className="rounded bg-brand/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-brand">
              admin
            </span>
          </div>
        ) : null}
        <form action={signOutPreview}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-brand/40 hover:text-brand"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}

function buildBreadcrumbs(pathname: string) {
  const base = [{ href: "/admin", label: "Admin" }];
  if (pathname === "/admin" || !pathname) return base;

  const segments = pathname.split("/").filter(Boolean).slice(1);
  let acc = "/admin";
  const extra = segments.map((seg) => {
    acc += `/${seg}`;
    const match = allAdminItems.find((item) => item.href === acc);
    return { href: acc, label: match?.label ?? titleCase(seg) };
  });

  return [...base, ...extra];
}

function titleCase(segment: string) {
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
