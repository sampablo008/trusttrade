import { CheckCircle2, Clock, XCircle } from "lucide-react";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ size?: number }> }
> = {
  pending: { label: "Pending", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", icon: Clock },
  approved: { label: "Approved", color: "text-[hsl(var(--color-up))] bg-[hsl(var(--color-up))]/10 border-[hsl(var(--color-up))]/30", icon: CheckCircle2 },
  paid: { label: "Paid", color: "text-[hsl(var(--color-up))] bg-[hsl(var(--color-up))]/10 border-[hsl(var(--color-up))]/30", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-[hsl(var(--color-down))] bg-[hsl(var(--color-down))]/10 border-[hsl(var(--color-down))]/30", icon: XCircle },
  cancelled: { label: "Cancelled", color: "text-muted bg-background/40 border-border", icon: XCircle },
};

export default function TransactionStatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: "text-muted bg-background/40 border-border",
    icon: Clock,
  };
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${cfg.color}`}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}
