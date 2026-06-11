"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

type ConfirmOptions = {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** style the confirm button as destructive (red) */
  danger?: boolean;
};

type ConfirmState = ConfirmOptions & { open: boolean; pending: boolean };

/**
 * Promise-based confirmation for destructive / high-impact actions.
 *
 *   const { confirm, dialog } = useConfirm();
 *   if (await confirm({ title: "Freeze trading?", danger: true })) { ... }
 *   return <>{dialog}{...}</>;
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    pending: false,
    title: "",
  });
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setState({ ...options, open: true, pending: false });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setState((s) => ({ ...s, open: false }));
  }, []);

  const dialog = (
    <Modal
      open={state.open}
      onClose={() => settle(false)}
      title={state.title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => settle(false)}>
            {state.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            variant={state.danger ? "danger" : "primary"}
            size="sm"
            onClick={() => settle(true)}
          >
            {state.confirmLabel ?? "Confirm"}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6 text-muted">
        {state.description ?? "This action cannot be undone."}
      </p>
    </Modal>
  );

  return { confirm, dialog };
}
