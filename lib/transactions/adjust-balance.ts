import "server-only";
import { ApiClientError } from "@/lib/api/client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface ApplyBalanceAdjustmentInput {
  deltaCents: number;
  memo: string;
  unlockTradesCents?: number;
  userId: string;
}

const isMissingRpcError = (error: { code?: string; message?: string } | null) => {
  if (!error) return false;

  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    error.message?.includes("Could not find the function public.apply_balance_adjustment") ||
    error.message?.includes("function public.apply_balance_adjustment") ||
    false
  );
};

export const applyBalanceAdjustment = async (
  admin: ReturnType<typeof createSupabaseAdminClient>,
  input: ApplyBalanceAdjustmentInput,
) => {
  const unlockTradesCents = input.unlockTradesCents ?? 0;

  const { error: rpcError } = await admin.rpc("apply_balance_adjustment", {
    p_delta_cents: input.deltaCents,
    p_memo: input.memo,
    p_unlock_trades_cents: unlockTradesCents,
    p_user_id: input.userId,
  });

  if (!rpcError) {
    return;
  }

  if (!isMissingRpcError(rpcError)) {
    throw new ApiClientError(rpcError.message, 500, "BALANCE_ADJUST_FAILED", rpcError);
  }

  const { data: currentBalance, error: fetchError } = await admin
    .from("user_balances")
    .select("balance_cents, locked_in_trades_cents")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (fetchError) {
    throw new ApiClientError(fetchError.message, 500, "BALANCE_FETCH_FAILED", fetchError);
  }

  if (!currentBalance) {
    throw new ApiClientError("User balance row not found.", 404, "BALANCE_NOT_FOUND");
  }

  const nextBalanceCents = Number(currentBalance.balance_cents) + input.deltaCents;
  const nextLockedTradesCents = Math.max(
    0,
    Number(currentBalance.locked_in_trades_cents) - unlockTradesCents,
  );

  if (nextBalanceCents < 0) {
    throw new ApiClientError(
      "Balance adjustment would make the balance negative.",
      422,
      "NEGATIVE_BALANCE",
    );
  }

  const { error: updateError } = await admin
    .from("user_balances")
    .update({
      balance_cents: nextBalanceCents,
      locked_in_trades_cents: nextLockedTradesCents,
    })
    .eq("user_id", input.userId);

  if (updateError) {
    throw new ApiClientError(updateError.message, 500, "BALANCE_UPDATE_FAILED", updateError);
  }

  const transactionKind = input.deltaCents >= 0 ? "admin_credit" : "admin_debit";
  const { error: insertError } = await admin.from("transactions").insert({
    amount_cents: input.deltaCents,
    balance_after_cents: nextBalanceCents,
    kind: transactionKind,
    memo: input.memo,
    reference_type: "admin_adjustment",
    user_id: input.userId,
  });

  if (insertError) {
    throw new ApiClientError(
      insertError.message,
      500,
      "BALANCE_TRANSACTION_INSERT_FAILED",
      insertError,
    );
  }
};
