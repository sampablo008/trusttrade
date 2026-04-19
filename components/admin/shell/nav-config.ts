import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Coins,
  Flag,
  GitBranch,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Mail,
  Megaphone,
  Network,
  Percent,
  ScrollText,
  Settings,
  Timer,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

export const adminNav: AdminNavSection[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/trades", label: "Trade queue", icon: Activity },
      { href: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine },
      { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText },
    ],
  },
  {
    label: "Users",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/invites", label: "Invites", icon: Mail },
    ],
  },
  {
    label: "Referrals",
    items: [
      { href: "/admin/referrals", label: "Overview", icon: Network },
      { href: "/admin/referrals/queue", label: "Commission queue", icon: ListChecks },
      { href: "/admin/referrals/flags", label: "Fraud flags", icon: Flag },
      { href: "/admin/referrals/rates", label: "Rate overrides", icon: Percent },
      { href: "/admin/referrals/tree", label: "Tree inspector", icon: GitBranch },
    ],
  },
  {
    label: "Markets",
    items: [
      { href: "/admin/tokens", label: "Tokens", icon: Coins },
      { href: "/admin/candles", label: "Price engine", icon: LineChart },
      { href: "/admin/periods", label: "Periods", icon: Timer },
      { href: "/admin/wallets", label: "Wallets", icon: Wallet },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/admin/promo", label: "Promo CMS", icon: Megaphone },
      { href: "/admin/config", label: "Global config", icon: Settings },
    ],
  },
];

export const allAdminItems: AdminNavItem[] = adminNav.flatMap((s) => s.items);
