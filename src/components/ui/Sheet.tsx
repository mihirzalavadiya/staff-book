"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/** Bottom sheet on phones, centred dialog on desktop. */
export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink-2/40" onClick={onClose} />
      <div
        className={cn(
          "relative w-full max-w-[520px] rounded-t-[22px] bg-surface p-5 pb-safe shadow-float sm:rounded-[6px] sm:p-6",
          className,
        )}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong sm:hidden" />
        {title && (
          <div className="mb-4 flex items-center justify-between border-b border-ink pb-3">
            <div className="font-display text-[28px] leading-none tracking-[-0.02em]">{title}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-muted-2 text-ink"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
