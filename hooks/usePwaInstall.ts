"use client";

import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let cachedEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
let globalHandlerAttached = false;

function notify() {
  listeners.forEach((fn) => fn());
}

function attachGlobalHandler() {
  if (globalHandlerAttached || typeof window === "undefined") return;
  globalHandlerAttached = true;
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    cachedEvent = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    cachedEvent = null;
    notify();
  });
}

function subscribe(callback: () => void) {
  attachGlobalHandler();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return cachedEvent;
}

function getServerSnapshot(): BeforeInstallPromptEvent | null {
  return null;
}

export function usePwaInstall() {
  const event = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const install = async () => {
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") {
      cachedEvent = null;
      notify();
    }
    return outcome === "accepted";
  };

  return { canInstall: event !== null, install };
}
