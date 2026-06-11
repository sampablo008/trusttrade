"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};

export type SelectProps<T extends string = string> = {
  value: T | null;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  /** accessible name when no visible label is wired via id */
  ariaLabel?: string;
};

/**
 * Listbox-pattern select with full keyboard support — replaces ad-hoc
 * useState dropdowns and supports leading icons (token/network pickers).
 */
export function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  id,
  invalid,
  disabled,
  className,
  ariaLabel,
}: SelectProps<T>) {
  const reactId = useId();
  const listId = `${id ?? reactId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function openMenu() {
    const current = options.findIndex((o) => o.value === value);
    setActiveIndex(current >= 0 ? current : 0);
    setOpen(true);
  }

  function move(delta: number) {
    setActiveIndex((i) => {
      let next = i;
      for (let step = 0; step < options.length; step++) {
        next = (next + delta + options.length) % options.length;
        if (!options[next]?.disabled) return next;
      }
      return i;
    });
  }

  function commit(index: number) {
    const opt = options[index];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (open) setOpen(false);
          else openMenu();
        }}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-[20px] border bg-background/40 px-4 py-4 text-sm outline-none transition focus-ring focus:border-brand disabled:cursor-not-allowed disabled:opacity-50",
          invalid ? "border-down/60" : "border-border",
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.icon}
          <span className={cn("truncate", selected ? "text-foreground" : "text-muted")}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 right-0 top-[calc(100%+6px)] max-h-64 overflow-y-auto rounded-2xl border border-border bg-surface-strong p-1.5 shadow-pop"
          style={{ zIndex: "var(--z-dropdown)" }}
        >
          {options.map((opt, index) => {
            const isSelected = opt.value === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(index);
                }}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm",
                  opt.disabled && "cursor-not-allowed opacity-40",
                  isActive ? "bg-background/60 text-foreground" : "text-muted",
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  {opt.icon}
                  <span className="truncate">{opt.label}</span>
                </span>
                {isSelected ? (
                  <Check className="h-4 w-4 text-brand" aria-hidden="true" />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
