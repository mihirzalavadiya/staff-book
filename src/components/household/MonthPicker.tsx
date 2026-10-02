"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { addMonths, formatMonth } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";

interface Props {
  value: string;
  latest: string;
  onChange: (month: string) => void;
  tone?: "glass" | "surface";
}

export function MonthPicker({ value, latest, onChange, tone = "glass" }: Props) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const months = Array.from({ length: 8 }, (_, i) => addMonths(latest, -i));
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-10 items-center gap-1.5 rounded-[20px] px-3.5 text-[13px] font-bold",
          tone === "glass" ? "bg-glass" : "bg-surface-2",
        )}
      >
        {formatMonth(value, lang)}
        <Icon name="chevronDown" size={14} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="grid grid-cols-2 gap-2">
          {months.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
              className={cn(
                "h-12 rounded-2xl text-[15px] font-bold",
                m === value ? "bg-coral text-white" : "bg-surface-2",
              )}
            >
              {formatMonth(m, lang)}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
