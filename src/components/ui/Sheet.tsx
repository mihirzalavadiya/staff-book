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
          "relative w-full max-w-[520px] rounded-t-[28px] bg-surface p-4 pb-safe shadow-float sm:rounded-[28px] sm:p-5",
          className,
        )}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" />
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display text-[22px] font-extrabold tracking-[-0.02em]">{title}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted"
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
