import Link from "next/link";
import type { ReactNode } from "react";

interface AuthCardProps {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export default function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
  backHref,
  backLabel,
}: AuthCardProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <section className="rounded-[32px] border border-border bg-surface-soft p-8 sm:p-10">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
            {eyebrow}
          </p>
          <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm leading-7 text-muted">{description}</p>
          ) : null}
        </div>

        <div className="mt-8">{children}</div>

        {footer ? (
          <div className="mt-6 text-sm text-muted">{footer}</div>
        ) : null}

        {backHref ? (
          <div className="mt-6">
            <Link
              href={backHref}
              className="text-xs font-semibold uppercase tracking-[0.24em] text-brand hover:text-foreground"
            >
              ← {backLabel ?? "Back"}
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
