import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  prefix?: string;
}

export function Field({ label, hint, prefix, className, id, ...rest }: FieldProps) {
  const inputId = id ?? `f-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <label htmlFor={inputId} className="block">
      <div className="mb-1.5 text-[13px] font-bold text-muted">{label}</div>
      <div
        className={cn(
          "flex h-12 items-center gap-2 rounded-2xl bg-surface-2 px-4 focus-within:ring-2 focus-within:ring-coral/40",
          className,
        )}
      >
        {prefix && <span className="font-display text-base font-bold text-muted">{prefix}</span>}
        <input
          id={inputId}
          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-muted-2"
          {...rest}
        />
      </div>
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
    </label>
  );
}
