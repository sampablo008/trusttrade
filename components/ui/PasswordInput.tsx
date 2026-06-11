"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { InputProps } from "./Input";

/**
 * Password field with an accessible show/hide toggle.
 * Mirrors Input styling but reserves right padding for the toggle button.
 */
export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(
  function PasswordInput({ invalid, className, ...rest }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          aria-invalid={invalid || undefined}
          className={cn(
            "w-full rounded-[20px] border bg-background/40 py-4 pl-4 pr-12 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus-ring focus:border-brand disabled:cursor-not-allowed disabled:opacity-50",
            invalid ? "border-down/60" : "border-border",
            className,
          )}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted transition-colors focus-ring hover:text-foreground"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);
