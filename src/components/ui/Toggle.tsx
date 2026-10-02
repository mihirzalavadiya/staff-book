"use client";

import { cn } from "@/lib/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-8 w-[52px] flex-none rounded-full transition-colors",
        checked ? "bg-coral" : "bg-line",
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left]",
          checked ? "left-[24px]" : "left-1",
        )}
      />
    </button>
  );
}
