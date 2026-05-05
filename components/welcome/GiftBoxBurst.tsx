"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type Stage = "closed" | "opening" | "open";

interface ConfettiPiece {
  id: number;
  angle: number;
  distance: number;
  size: number;
  hue: number;
  delay: number;
  rotate: number;
}

const PIECE_COUNT = 36;

const buildConfetti = (): ConfettiPiece[] =>
  Array.from({ length: PIECE_COUNT }, (_, i) => {
    const angle = (i / PIECE_COUNT) * Math.PI * 2 + Math.random() * 0.6;
    return {
      id: i,
      angle,
      distance: 180 + Math.random() * 220,
      size: 6 + Math.random() * 10,
      hue: Math.floor(Math.random() * 360),
      delay: Math.random() * 0.2,
      rotate: Math.random() * 720 - 360,
    };
  });

interface Props {
  amountLabel: string;
  onClaim: () => Promise<void> | void;
  claiming: boolean;
  errorMessage: string | null;
}

export default function GiftBoxBurst({
  amountLabel,
  onClaim,
  claiming,
  errorMessage,
}: Props) {
  const [stage, setStage] = useState<Stage>("closed");
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [displayAmount, setDisplayAmount] = useState(0);

  const handleOpen = async () => {
    if (stage !== "closed" || claiming) return;
    setStage("opening");
    setPieces(buildConfetti());
    try {
      await onClaim();
      setStage("open");
    } catch {
      setStage("closed");
    }
  };

  useEffect(() => {
    if (stage !== "open") return;
    const target = parseFloat(amountLabel.replace(/[^0-9.]/g, "")) || 0;
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayAmount(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, amountLabel]);

  return (
    <div className="relative flex flex-col items-center">
      {/* Halo */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 mx-auto h-72 w-72 rounded-full bg-brand/30 blur-[80px]"
        animate={{
          scale: stage === "open" ? [1, 1.4, 1.2] : [1, 1.1, 1],
          opacity: stage === "open" ? [0.6, 1, 0.85] : [0.5, 0.7, 0.5],
        }}
        transition={{
          duration: stage === "open" ? 1.4 : 2.4,
          repeat: stage === "open" ? 0 : Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Confetti */}
      <AnimatePresence>
        {stage !== "closed" &&
          pieces.map((p) => (
            <motion.span
              key={p.id}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 block rounded-[2px]"
              style={{
                width: p.size,
                height: p.size * 0.4,
                backgroundColor: `hsl(${p.hue} 90% 60%)`,
                boxShadow: `0 0 12px hsl(${p.hue} 90% 60% / 0.6)`,
              }}
              initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
              animate={{
                x: Math.cos(p.angle) * p.distance,
                y: Math.sin(p.angle) * p.distance + 60,
                opacity: [0, 1, 1, 0],
                rotate: p.rotate,
                scale: [0.4, 1, 0.9],
              }}
              transition={{
                duration: 1.6,
                delay: p.delay,
                ease: [0.16, 0.84, 0.44, 1],
                opacity: { times: [0, 0.1, 0.7, 1], duration: 1.6, delay: p.delay },
              }}
            />
          ))}
      </AnimatePresence>

      {/* The box / reveal */}
      <div className="relative flex h-72 w-72 items-center justify-center">
        <AnimatePresence mode="wait">
          {stage !== "open" ? (
            <motion.button
              key="box"
              type="button"
              onClick={handleOpen}
              disabled={claiming || stage === "opening"}
              className="group relative flex h-48 w-48 items-center justify-center rounded-[36px] border border-brand/40 bg-linear-to-br from-brand to-[hsl(var(--color-down))] text-background shadow-2xl shadow-brand/40 outline-none focus-visible:ring-4 focus-visible:ring-brand/40 disabled:cursor-not-allowed"
              initial={{ scale: 0.6, opacity: 0, y: 20 }}
              animate={
                stage === "opening"
                  ? { scale: [1, 1.18, 0], opacity: [1, 1, 0], rotate: [0, -8, 12] }
                  : {
                      scale: [1, 1.04, 1],
                      opacity: 1,
                      y: [0, -6, 0],
                    }
              }
              exit={{ opacity: 0, scale: 0 }}
              transition={
                stage === "opening"
                  ? { duration: 0.7, times: [0, 0.5, 1], ease: "easeIn" }
                  : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
              }
              whileHover={stage === "closed" ? { scale: 1.06 } : undefined}
              whileTap={stage === "closed" ? { scale: 0.94 } : undefined}
            >
              {/* Ribbon vertical */}
              <span className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-background/80" />
              {/* Ribbon horizontal */}
              <span className="absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 bg-background/80" />
              {/* Bow */}
              <span className="absolute left-1/2 top-1/2 h-12 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/90 shadow-lg" />
              <Gift
                size={56}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-brand drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]"
              />
            </motion.button>
          ) : (
            <motion.div
              key="reveal"
              className="flex flex-col items-center gap-2"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
            >
              <div className="flex items-center gap-2 rounded-full border border-up/40 bg-up/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-up">
                <Sparkles size={14} />
                Bonus claimed
              </div>
              <p className="font-display text-5xl font-bold text-foreground sm:text-6xl">
                ${displayAmount.toFixed(2)}
              </p>
              <p className="text-sm text-muted">added to your USDT balance</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CTA + error */}
      <div className="mt-8 flex w-full flex-col items-center gap-3">
        {stage === "closed" && (
          <motion.button
            type="button"
            onClick={handleOpen}
            disabled={claiming}
            className="inline-flex items-center justify-center rounded-full bg-brand px-8 py-4 text-sm font-semibold text-background shadow-lg shadow-brand/30 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {claiming ? "Claiming..." : `Open my ${amountLabel} gift`}
          </motion.button>
        )}
        {stage === "opening" && (
          <p className="text-sm text-muted">Unwrapping your welcome bonus...</p>
        )}
        {errorMessage && (
          <p className="text-center text-sm text-down">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
