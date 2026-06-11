import {
  CheckCircle2,
  Clock3,
  XCircle,
  Ban,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge, type Tone } from "./Badge";

type StatusMeta = { tone: Tone; icon: ReactNode; label?: string };

const ICON = "h-3 w-3";

// Pair every status color with an icon — never convey state by color alone.
const STATUS_MAP: Record<string, StatusMeta> = {
  pending: { tone: "warning", icon: <Clock3 className={ICON} /> },
  processing: { tone: "warning", icon: <Clock3 className={ICON} /> },
  active: { tone: "brand", icon: <Clock3 className={ICON} /> },
  approved: { tone: "up", icon: <CheckCircle2 className={ICON} /> },
  paid: { tone: "up", icon: <CheckCircle2 className={ICON} /> },
  settled: { tone: "up", icon: <CheckCircle2 className={ICON} /> },
  completed: { tone: "up", icon: <CheckCircle2 className={ICON} /> },
  win: { tone: "up", icon: <TrendingUp className={ICON} /> },
  rejected: { tone: "down", icon: <XCircle className={ICON} /> },
  failed: { tone: "down", icon: <XCircle className={ICON} /> },
  lose: { tone: "down", icon: <TrendingDown className={ICON} /> },
  cancelled: { tone: "neutral", icon: <Ban className={ICON} /> },
  canceled: { tone: "neutral", icon: <Ban className={ICON} /> },
  void: { tone: "neutral", icon: <Minus className={ICON} /> },
};

export type StatusPillProps = {
  status: string;
  className?: string;
};

export function StatusPill({ status, className }: StatusPillProps) {
  const key = status.toLowerCase();
  const meta = STATUS_MAP[key] ?? { tone: "neutral" as Tone, icon: null };
  return (
    <Badge tone={meta.tone} icon={meta.icon} className={className}>
      {status}
    </Badge>
  );
}
