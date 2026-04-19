import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";

const HIGHLIGHTS = [
  { icon: ShieldCheck, label: "Safe custody", body: "Funds are secured in segregated cold wallets." },
  { icon: Clock, label: "Fast approval", body: "Most deposits are confirmed within 1-2 hours." },
  { icon: CheckCircle2, label: "Zero fees", body: "TrustPro charges no platform deposit fees." },
];

export default function DepositInfoPanel() {
  return (
    <aside className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface-soft p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Why TrustPro
        </p>
        <h3 className="mt-2 font-display text-lg text-foreground">
          Deposit with confidence.
        </h3>
      </div>

      <ul className="flex flex-col gap-3">
        {HIGHLIGHTS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon size={14} />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                <span className="text-xs text-muted">{item.body}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-400">
          Important
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Always double-check the address and network before sending. Wrong-network transfers
          cannot be recovered.
        </p>
      </div>
    </aside>
  );
}
