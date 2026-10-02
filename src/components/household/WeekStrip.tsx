"use client";

import { cn } from "@/lib/cn";
import { dayShort, dayOfMonth, weekOf, weekdayOf } from "@/lib/date";
import { dayInfo } from "@/lib/ledger";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { DayState } from "@/lib/types";

const DOT: Record<DayState, string> = {
  present: "bg-present-dot",
  leave: "bg-leave-icon",
  claim: "bg-claim-dot",
  dispute: "bg-dispute-dot",
  unknown: "bg-transparent",
  off: "bg-transparent",
};

/** Worst state across active workers for a day, so the dot tells you if the day needs attention. */
function summarize(states: DayState[]): DayState {
  const order: DayState[] = ["dispute", "claim", "unknown", "leave", "present", "off"];
  for (const s of order) if (states.includes(s)) return s;
  return "off";
}

interface WeekStripProps {
  workerId?: string;
  /** Tailwind classes for the cell, mostly height. */
  cellClassName?: string;
  /** Cell background: translucent white on peach, or solid surface. */
  tone?: "glass" | "surface";
  onSelect?: (date: string) => void;
  selected?: string;
}

export function WeekStrip({ workerId, cellClassName = "h-16", tone = "glass", onSelect, selected }: WeekStripProps) {
  const { lang } = useI18n();
  const { state } = useStore();
  const days = weekOf(state.today);
  const workers = workerId ? state.workers.filter((w) => w.id === workerId) : state.workers.filter((w) => !w.endDate);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((date) => {
        const isToday = date === state.today;
        const isSelected = selected ? selected === date : isToday;
        const future = date > state.today;
        const st = future ? "off" : summarize(workers.map((w) => dayInfo(state, w, date).state));
        const Comp = onSelect ? "button" : "div";
        return (
          <Comp
            key={date}
            type={onSelect ? "button" : undefined}
            onClick={onSelect ? () => onSelect(date) : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 rounded-[20px]",
              cellClassName,
              isSelected ? "bg-coral text-white" : tone === "glass" ? "bg-glass-2 text-ink" : "bg-surface text-ink",
            )}
          >
            <span className={cn("text-[11px] font-semibold", isSelected ? "opacity-80" : "opacity-55")}>
              {dayShort(lang)[weekdayOf(date)]}
            </span>
            <span className="font-display text-lg font-bold leading-none">{dayOfMonth(date)}</span>
            <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", DOT[st])} />
          </Comp>
        );
      })}
    </div>
  );
}
