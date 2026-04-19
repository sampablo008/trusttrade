"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const STORAGE_KEY = "tp_cookie_consent";

export default function CookieBanner() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      el.style.display = "block";
    }
  }, []);

  function dismiss() {
    if (ref.current) ref.current.style.display = "none";
  }

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    dismiss();
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "declined");
    dismiss();
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Cookie consent"
      style={{ display: "none" }}
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl border border-border bg-surface-soft p-5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-md md:left-auto md:right-6 md:max-w-sm"
    >
      <p className="text-sm leading-6 text-muted">
        We use essential session cookies only — no tracking. By continuing you accept our{" "}
        <Link href="/legal/privacy" className="text-brand hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-4 flex gap-3">
        <button
          onClick={accept}
          className="flex-1 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
        >
          Accept
        </button>
        <button
          onClick={decline}
          className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted transition hover:text-foreground"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
