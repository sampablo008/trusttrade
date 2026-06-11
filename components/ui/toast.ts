import { toast } from "sonner";

/**
 * Thin wrapper over Sonner so every async action reports consistently.
 * Toasts use aria-live and do not steal focus (Sonner default).
 */
export const notify = {
  success: (message: string, description?: string) =>
    toast.success(message, { description }),
  error: (message: string, description?: string) =>
    toast.error(message, { description }),
  info: (message: string, description?: string) =>
    toast.message(message, { description }),
  loading: (message: string) => toast.loading(message),
  dismiss: (id?: string | number) => toast.dismiss(id),
  /** Wrap a promise with pending/success/error toasts. */
  promise: <T>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    },
  ) => toast.promise(promise, msgs),
};
