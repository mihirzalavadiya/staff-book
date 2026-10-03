"use client";

import { cn } from "@/lib/cn";
import { dayShort, dayOfMonth, weekOf, weekdayOf } from "@/lib/date";
import { dayInfo } from "@/lib/ledger";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { DayState } from "@/lib/types";

const DOT: Record<DayState, string> = {
  present: "bg-present-dot",
  leave: "bg-off-fg",
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

/** This week as a ledger row: day label, date in a circle (today filled), a status dot. */
export function WeekStrip({ className }: { className?: string }) {
  const { lang } = useI18n();
  const { state } = useStore();
  const workers = state.workers.filter((w) => !w.endDate);

  return (
    <div className={cn("grid grid-cols-7 border-t border-line-strong pt-2.5", className)}>
      {weekOf(state.today).map((date, i) => {
        const isToday = date === state.today;
        const st = date > state.today ? "off" : summarize(workers.map((w) => dayInfo(state, w, date).state));
        return (
          <div key={date} className={cn("flex flex-col items-center gap-1.5 py-1", i > 0 && "border-l border-line")}>
            <span className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
              {dayShort(lang)[weekdayOf(date)]}
            </span>
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full font-display text-xl",
                isToday ? "bg-ink text-bg" : "text-ink",
              )}
            >
              {dayOfMonth(date)}
            </span>
            <span className={cn("h-[5px] w-[5px] rounded-full", DOT[st])} />
          </div>
        );
      })}
    </div>
  );
}
