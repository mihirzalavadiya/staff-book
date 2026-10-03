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
      <div className="label-caps mb-2">{label}</div>
      <div
        className={cn(
          "flex h-12 items-center gap-2 border-b border-line-strong focus-within:border-ink",
          className,
        )}
      >
        {prefix && <span className="font-display text-xl text-muted">{prefix}</span>}
        <input
          id={inputId}
          className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:font-normal placeholder:text-muted-2"
          {...rest}
        />
      </div>
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
    </label>
  );
}
