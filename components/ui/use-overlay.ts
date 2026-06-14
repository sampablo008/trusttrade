"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Overlay a11y in one hook: Esc-to-close, focus trap, focus restore on close,
 * and body scroll lock while open. Returns a ref to attach to the panel.
 */
export function useOverlay({
  open,
  onClose,
  closeOnEsc = true,
}: {
  open: boolean;
  onClose: () => void;
  closeOnEsc?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  // Keep latest props in refs so the effects below depend only on `open`.
  // Depending on `onClose`/`closeOnEsc` would re-run the focus effect on every
  // parent render (handlers are usually inline), yanking focus back to the
  // first focusable element (the close button) on each keystroke.
  const onCloseRef = useRef(onClose);
  const closeOnEscRef = useRef(closeOnEsc);
  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscRef.current = closeOnEsc;
  });

  // Focus move + scroll lock + focus restore — runs only when `open` flips.
  useEffect(() => {
    if (!open) return;

    restoreRef.current = document.activeElement as HTMLElement | null;

    // Lock body scroll without layout shift.
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    // Move focus into the panel.
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      restoreRef.current?.focus?.();
    };
  }, [open]);

  // Esc-to-close + Tab focus trap — reads latest props via refs.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      const panel = panelRef.current;
      if (event.key === "Escape" && closeOnEscRef.current) {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (nodes.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && active === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  return panelRef;
}
