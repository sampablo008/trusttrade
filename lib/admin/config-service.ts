import "server-only";
import type { AppConfig, BusinessDashboard, SupportContacts, UpdateAppConfigInput } from "@/types/admin";
import { previewAppConfig, previewBusinessDashboard } from "@/lib/admin/preview-data";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const getAppConfig = async (): Promise<AppConfig> => {
  if (!getOptionalServerEnv()) return previewAppConfig;

  const db = createSupabaseAdminClient();
  const { data, error } = await db.from("app_config").select("*").eq("id", 1).single();
  if (error) throw new Error(error.message);

  return {
    bonusTicketTtlDays: data.bonus_ticket_ttl_days,
    bonusWagerMultiplier: Number(data.bonus_wager_multiplier),
    depositBonusMaxCents: data.deposit_bonus_max_cents,
    depositBonusPctBps: data.deposit_bonus_pct_bps,
    expiryPolicy: data.expiry_policy,
    globalTradeFreezeEnabled: data.global_trade_freeze,
    id: data.id,
    refDefaultL1Bps: data.ref_default_l1_bps,
    refDefaultL2Bps: data.ref_default_l2_bps,
    refDefaultL3Bps: data.ref_default_l3_bps,
    refDefaultL4Bps: data.ref_default_l4_bps,
    refDefaultL5Bps: data.ref_default_l5_bps,
    refMinDepositCents: data.ref_min_deposit_cents,
    signupBonusCents: data.signup_bonus_cents,
    supportTelegram: data.support_telegram,
    supportWhatsapp: data.support_whatsapp,
    swapFeeBps: data.swap_fee_bps,
    withdrawFeeBps: data.withdraw_fee_bps,
    withdrawMinCents: data.withdraw_min_cents,
  };
};

export const updateAppConfig = async (input: UpdateAppConfigInput): Promise<AppConfig> => {
  if (!getOptionalServerEnv()) return { ...previewAppConfig, ...input };

  const db = createSupabaseAdminClient();
  const patch: Record<string, unknown> = {};

  if (input.bonusTicketTtlDays !== undefined) patch.bonus_ticket_ttl_days = input.bonusTicketTtlDays;
  if (input.bonusWagerMultiplier !== undefined) patch.bonus_wager_multiplier = input.bonusWagerMultiplier;
  if (input.depositBonusMaxCents !== undefined) patch.deposit_bonus_max_cents = input.depositBonusMaxCents;
  if (input.depositBonusPctBps !== undefined) patch.deposit_bonus_pct_bps = input.depositBonusPctBps;
  if (input.expiryPolicy !== undefined) patch.expiry_policy = input.expiryPolicy;
  if (input.globalTradeFreezeEnabled !== undefined) patch.global_trade_freeze = input.globalTradeFreezeEnabled;
  if (input.refDefaultL1Bps !== undefined) patch.ref_default_l1_bps = input.refDefaultL1Bps;
  if (input.refDefaultL2Bps !== undefined) patch.ref_default_l2_bps = input.refDefaultL2Bps;
  if (input.refDefaultL3Bps !== undefined) patch.ref_default_l3_bps = input.refDefaultL3Bps;
  if (input.refDefaultL4Bps !== undefined) patch.ref_default_l4_bps = input.refDefaultL4Bps;
  if (input.refDefaultL5Bps !== undefined) patch.ref_default_l5_bps = input.refDefaultL5Bps;
  if (input.refMinDepositCents !== undefined) patch.ref_min_deposit_cents = input.refMinDepositCents;
  if (input.signupBonusCents !== undefined) patch.signup_bonus_cents = input.signupBonusCents;
  if (input.supportTelegram !== undefined) patch.support_telegram = input.supportTelegram;
  if (input.supportWhatsapp !== undefined) patch.support_whatsapp = input.supportWhatsapp;
  if (input.swapFeeBps !== undefined) patch.swap_fee_bps = input.swapFeeBps;
  if (input.withdrawFeeBps !== undefined) patch.withdraw_fee_bps = input.withdrawFeeBps;
  if (input.withdrawMinCents !== undefined) patch.withdraw_min_cents = input.withdrawMinCents;

  const { data, error } = await db.from("app_config").update(patch).eq("id", 1).select("*").single();
  if (error) throw new Error(error.message);

  return {
    bonusTicketTtlDays: data.bonus_ticket_ttl_days,
    bonusWagerMultiplier: Number(data.bonus_wager_multiplier),
    depositBonusMaxCents: data.deposit_bonus_max_cents,
    depositBonusPctBps: data.deposit_bonus_pct_bps,
    expiryPolicy: data.expiry_policy,
    globalTradeFreezeEnabled: data.global_trade_freeze,
    id: data.id,
    refDefaultL1Bps: data.ref_default_l1_bps,
    refDefaultL2Bps: data.ref_default_l2_bps,
    refDefaultL3Bps: data.ref_default_l3_bps,
    refDefaultL4Bps: data.ref_default_l4_bps,
    refDefaultL5Bps: data.ref_default_l5_bps,
    refMinDepositCents: data.ref_min_deposit_cents,
    signupBonusCents: data.signup_bonus_cents,
    supportTelegram: data.support_telegram,
    supportWhatsapp: data.support_whatsapp,
    swapFeeBps: data.swap_fee_bps,
    withdrawFeeBps: data.withdraw_fee_bps,
    withdrawMinCents: data.withdraw_min_cents,
  };
};

// Public-safe reader: only the two support-channel fields, no admin gate.
// Used by the landing page (cached) and the user profile/settings section.
export const getSupportContacts = async (): Promise<SupportContacts> => {
  if (!getOptionalServerEnv()) {
    return { telegram: previewAppConfig.supportTelegram, whatsapp: previewAppConfig.supportWhatsapp };
  }

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("app_config")
    .select("support_telegram, support_whatsapp")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);

  return { telegram: data.support_telegram, whatsapp: data.support_whatsapp };
};

export const getBusinessDashboard = async (): Promise<BusinessDashboard> => {
  if (!getOptionalServerEnv()) return previewBusinessDashboard;

  const db = createSupabaseAdminClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [activeTradesRes, stakedTodayRes, pendingDepositsRes, pendingWithdrawalsRes, topTradersRes] =
    await Promise.all([
      db.from("user_trades").select("stake_cents", { count: "exact" }).eq("status", "active"),
      db
        .from("user_trades")
        .select("stake_cents")
        .gte("started_at", todayStart.toISOString())
        .in("status", ["active", "won", "lost"]),
      db.from("deposits").select("id", { count: "exact" }).eq("status", "pending"),
      db.from("withdrawals").select("id", { count: "exact" }).eq("status", "pending"),
      db
        .from("user_trades")
        .select("user_id, stake_cents, payout_bps, outcome, profiles!inner(username)")
        .in("status", ["won", "lost"])
        .gte("started_at", todayStart.toISOString()),
    ]);

  const activeTrades = activeTradesRes.count ?? 0;
  const totalExposureCents = (activeTradesRes.data ?? []).reduce(
    (s, t) => s + (t.stake_cents as number),
    0,
  );
  const totalStakedTodayCents = (stakedTodayRes.data ?? []).reduce(
    (s, t) => s + (t.stake_cents as number),
    0,
  );
  const pendingDeposits = pendingDepositsRes.count ?? 0;
  const pendingWithdrawals = pendingWithdrawalsRes.count ?? 0;

  const userPnl = new Map<string, { username: string; pnl: number; trades: number }>();
  for (const t of topTradersRes.data ?? []) {
    const uid = t.user_id as string;
    const profileData = t.profiles as unknown as { username: string };
    const username = profileData.username;
    const stake = t.stake_cents as number;
    const payout = t.outcome === "won" ? Math.floor((stake * (t.payout_bps as number)) / 10000) : 0;
    const pnl = t.outcome === "won" ? payout - stake : -stake;
    const existing = userPnl.get(uid) ?? { username, pnl: 0, trades: 0 };
    userPnl.set(uid, { username, pnl: existing.pnl + pnl, trades: existing.trades + 1 });
  }

  const sorted = [...userPnl.entries()].sort((a, b) => b[1].pnl - a[1].pnl);
  const topWinners = sorted.slice(0, 5).map(([uid, v]) => ({
    netPnlCents: v.pnl,
    totalTrades: v.trades,
    userId: uid,
    username: v.username,
  }));
  const topLosers = sorted
    .slice(-5)
    .reverse()
    .map(([uid, v]) => ({
      netPnlCents: v.pnl,
      totalTrades: v.trades,
      userId: uid,
      username: v.username,
    }));

  const dailyNetPnlCents = sorted.reduce((s, [, v]) => s - v.pnl, 0); // house = negative of user net

  return {
    activeTrades,
    dailyNetPnlCents,
    pendingDeposits,
    pendingWithdrawals,
    topLosers,
    topWinners,
    totalExposureCents,
    totalStakedTodayCents,
  };
};
