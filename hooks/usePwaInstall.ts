"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let cachedEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(e: BeforeInstallPromptEvent | null) => void>();
let globalHandlerAttached = false;

function attachGlobalHandler() {
  if (globalHandlerAttached || typeof window === "undefined") return;
  globalHandlerAttached = true;
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    cachedEvent = e as BeforeInstallPromptEvent;
    listeners.forEach((fn) => fn(cachedEvent));
  });
  window.addEventListener("appinstalled", () => {
    cachedEvent = null;
    listeners.forEach((fn) => fn(null));
  });
}

export function usePwaInstall() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(cachedEvent);

  useEffect(() => {
    attachGlobalHandler();
    setEvent(cachedEvent);
    listeners.add(setEvent);
    return () => {
      listeners.delete(setEvent);
    };
  }, []);

  const install = async () => {
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") {
      cachedEvent = null;
      listeners.forEach((fn) => fn(null));
    }
    return outcome === "accepted";
  };

  return { canInstall: event !== null, install };
}
