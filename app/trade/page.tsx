import { signOutPreview } from "@/app/actions/auth";
import { assertAuthenticated } from "@/lib/auth/session";
import { formatUsdFromCents } from "@/lib/utils/format";

const tradeHighlights = [
  { label: "Available balance", value: formatUsdFromCents(184500) },
  { label: "Locked in trades", value: formatUsdFromCents(25000) },
  { label: "Countdown queue", value: "3 live positions" },
];

export default async function TradePage() {
  const session = await assertAuthenticated();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[36px] border border-border bg-surface-soft p-8">
        <div className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
              Trader desk preview
            </p>
            <h1 className="font-display text-5xl tracking-tight text-foreground">/trade</h1>
            <p className="max-w-2xl text-base leading-8 text-muted">
              Protected route scaffold is active. Later phases will replace this placeholder with
              the chart, real order ticket, active positions, and SSE user stream.
            </p>
          </div>

          <form action={signOutPreview}>
            <button
              type="submit"
              className="rounded-full border border-border bg-background/35 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-brand"
            >
              Sign out {session.username ? `(${session.username})` : ""}
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {tradeHighlights.map((item) => (
            <article
              key={item.label}
              className="rounded-[28px] border border-border bg-background/30 p-5"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-muted">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{item.value}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
