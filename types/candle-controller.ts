export type CandleControlAction = "freeze" | "unfreeze" | "nudge" | "set_feed_source";

export interface CandleControllerState {
  driftBiasBps: number;
  feedSource: "synthetic" | "shadow" | "replay" | "frozen";
  freezePriceCents: number | null;
  lastPriceCents: number | null;
  lastShadowPriceCents: number | null;
  tokenId: string;
  tokenSymbol: string;
}

export interface CandleControllerPatchInput {
  driftBiasBps?: number;
  feedSource?: "synthetic" | "shadow" | "replay" | "frozen";
}

export interface CandleHardSetInput {
  priceCents: number;
}
