"use client";

import { cn } from "@/lib/cn";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  size?: "md" | "lg";
}

export function Segmented<T extends string>({ value, options, onChange, size = "md" }: SegmentedProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full font-bold transition-colors",
              size === "lg" ? "h-12 px-5 text-[15px]" : "h-10 px-4 text-sm",
              active ? "bg-coral text-white" : "bg-surface-2 text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
