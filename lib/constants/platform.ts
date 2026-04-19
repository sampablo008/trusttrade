import type {
  ExperienceMetric,
  FlowStep,
  MarketSnapshot,
  QueueFilter,
  ReferralMilestone,
  SecurityInvariant,
  SettlementRow,
  TimeframeOption,
} from "@/types/platform";

export const marketSnapshots: MarketSnapshot[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    priceCents: 8445234,
    dayChangePercent: 2.84,
    shadowOffsetPercent: 1.18,
    volumeLabel: "$182.4M",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    priceCents: 284342,
    dayChangePercent: 1.67,
    shadowOffsetPercent: -0.64,
    volumeLabel: "$94.7M",
  },
  {
    symbol: "SOL",
    name: "Solana",
    priceCents: 17844,
    dayChangePercent: -0.92,
    shadowOffsetPercent: 0.42,
    volumeLabel: "$38.9M",
  },
];

export const timeframeOptions: TimeframeOption[] = [
  { label: "1s", value: "1s" },
  { label: "15s", value: "15s" },
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
];

export const queueFilters: QueueFilter[] = [
  { label: "Urgent", value: "urgent" },
  { label: "Flagged", value: "flagged" },
  { label: "All", value: "all" },
];

export const experienceMetrics: ExperienceMetric[] = [
  {
    label: "Auto-loss safety",
    value: "Enabled",
    detail: "Expired trades settle to lose unless admin acts first.",
  },
  {
    label: "Referral ladder",
    value: "5 levels",
    detail: "Pending commissions route into locked bonus tickets.",
  },
  {
    label: "Wallet support",
    value: "4 rails",
    detail: "USDT TRC20, ERC20, BEP20, plus BTC deposit workflows.",
  },
  {
    label: "Payout model",
    value: "1.85x",
    detail: "Win returns stake plus 85% profit preview inside the ticket.",
  },
];

export const settlementRows: SettlementRow[] = [
  {
    id: "TRD-29381",
    user: "atlas_vault",
    pair: "BTC / USD",
    token: "BTC",
    direction: "long",
    stakeCents: 25000,
    expiresIn: "00:11",
    status: "urgent",
    flag: "RAPID",
  },
  {
    id: "TRD-29374",
    user: "north.sparrow",
    pair: "ETH / USD",
    token: "ETH",
    direction: "short",
    stakeCents: 14000,
    expiresIn: "00:28",
    status: "flagged",
    flag: "NEW_USER",
  },
  {
    id: "TRD-29363",
    user: "quiet.archer",
    pair: "BTC / USD",
    token: "BTC",
    direction: "short",
    stakeCents: 9000,
    expiresIn: "01:04",
    status: "pending",
    flag: "NONE",
  },
  {
    id: "TRD-29359",
    user: "solgrid",
    pair: "SOL / USD",
    token: "SOL",
    direction: "long",
    stakeCents: 47500,
    expiresIn: "03:42",
    status: "pending",
    flag: "LOW_VOL",
  },
];

export const moneyLoop: FlowStep[] = [
  {
    title: "Deposit comes in",
    description:
      "User picks a wallet rail, uploads proof, then waits for admin approval before balance moves.",
  },
  {
    title: "Trade enters queue",
    description:
      "The ticket locks integer-cents balance, starts a real countdown, and surfaces in admin decision order.",
  },
  {
    title: "Outcome gets chosen",
    description:
      "Admin wins, loses, or voids. If no one acts before expiry, the safety policy settles to lose.",
  },
  {
    title: "Bonus stays trapped",
    description:
      "Commissions, signup credits, and gifts remain locked until the configured wager threshold clears.",
  },
];

export const securityInvariants: SecurityInvariant[] = [
  {
    title: "Server-only data layer",
    description: "No browser Supabase client. All stateful work routes through Next APIs.",
  },
  {
    title: "Integer-cents money math",
    description: "Balances, stakes, and payouts stay in cents. No float drift. No rounding lies.",
  },
  {
    title: "Audit-first actions",
    description: "Admin controls, settlement, and wallet operations stay structured for later audit trails.",
  },
];

export const referralMilestones: ReferralMilestone[] = [
  { level: "L1", rateLabel: "5.0%", note: "Direct inviter cashes first." },
  { level: "L2", rateLabel: "3.0%", note: "Second ring stays meaningful." },
  { level: "L3", rateLabel: "2.0%", note: "Volume layer starts compounding." },
  { level: "L4", rateLabel: "1.0%", note: "Low friction long-tail incentive." },
  { level: "L5", rateLabel: "0.5%", note: "Keeps the pyramid visible at the edge." },
];

export const payoutMultiplier = 1.85;
export const stakeOptions = [2500, 10000, 25000, 50000];
