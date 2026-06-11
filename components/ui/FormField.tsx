import type { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const labelClass =
  "text-xs font-semibold uppercase tracking-[0.24em] text-muted";

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
};

export function Label({ required, className, children, ...rest }: LabelProps) {
  return (
    <label className={cn(labelClass, className)} {...rest}>
      {children}
      {required ? (
        <span aria-hidden="true" className="ml-1 text-down">
          *
        </span>
      ) : null}
    </label>
  );
}

export type FormFieldProps = {
  /** id of the control this field wraps — wires label + error via aria */
  htmlFor: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  /** optional right-aligned slot next to the label (e.g. "Forgot?", balance) */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * Label + control + helper/error, with role="alert" + aria-describedby wiring.
 * Pass the control as children with `id={htmlFor}` and
 * `aria-describedby={`${htmlFor}-error`}` when invalid.
 */
export function FormField({
  htmlFor,
  label,
  required,
  hint,
  error,
  action,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
        {action}
      </div>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-xs leading-5 text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          aria-live="polite"
          className="text-sm text-down"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
