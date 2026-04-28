"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-sm items-center justify-between gap-4 rounded-[20px] border border-border bg-surface-soft px-5 py-4 shadow-2xl sm:bottom-6 sm:left-6 sm:right-auto">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-foreground">Install TrustTrade</p>
        <p className="text-xs text-muted">Add to home screen for fast access</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleInstall}
          className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-2 text-xs font-semibold text-background transition hover:opacity-90"
        >
          <Download size={13} />
          Install
        </button>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="rounded-full border border-border p-2 text-muted transition hover:border-brand"
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
