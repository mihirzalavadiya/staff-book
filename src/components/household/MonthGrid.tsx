"use client";

import { cn } from "@/lib/cn";
import { dayShort, dayOfMonth, monthDates, weekdayOf } from "@/lib/date";
import { dayInfo } from "@/lib/ledger";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import type { DayState, Worker } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

const CELL: Record<DayState, string> = {
  present: "bg-present-cell text-present-fg",
  leave: "bg-leave-cell text-leave-fg",
  claim: "bg-claim-icon text-claim-fg",
  dispute: "bg-dispute-icon text-dispute-fg",
  unknown: "border-2 border-dashed border-line-dashed text-leave-fg",
  off: "text-off-fg font-medium",
};

interface Props {
  worker: Worker;
  month: string;
  selected?: string;
  onSelect?: (date: string) => void;
  /** Compact mode is the small widget from the desktop home. */
  compact?: boolean;
}

export function MonthGrid({ worker, month, selected, onSelect, compact }: Props) {
  const { lang } = useI18n();
  const { state } = useStore();
  const dates = monthDates(month);
  const lead = weekdayOf(dates[0]);
  const size = compact ? "h-[26px] text-xs" : "h-10 text-[13px]";

  return (
    <div>
      {!compact && (
        <div className="mb-1.5 grid grid-cols-7 gap-1.5">
          {dayShort(lang).map((d) => (
            <div key={d} className="text-center text-[11px] font-bold text-muted-2">
              {d}
            </div>
          ))}
        </div>
      )}
      <div className={cn("grid grid-cols-7", compact ? "gap-[5px]" : "gap-1.5")}>
        {Array.from({ length: lead }).map((_, i) => (
          <div key={`lead${i}`} />
        ))}
        {dates.map((date) => {
          const info = dayInfo(state, worker, date);
          const isToday = date === state.today;
          const isSelected = selected === date;
          const future = date > state.today;
          const st: DayState = future && info.state === "unknown" ? "off" : info.state;
          const Comp = onSelect ? "button" : "div";
          return (
            <Comp
              key={date}
              type={onSelect ? "button" : undefined}
              onClick={onSelect ? () => onSelect(date) : undefined}
              aria-pressed={onSelect ? isSelected : undefined}
              className={cn(
                "flex items-center justify-center gap-0.5 rounded-xl font-bold",
                size,
                isToday ? "bg-coral text-white" : CELL[st],
                isSelected && !isToday && "ring-2 ring-coral ring-offset-2 ring-offset-surface",
              )}
            >
              {dayOfMonth(date)}
              {st === "claim" && <Icon name="question" size={compact ? 10 : 12} strokeWidth={3.4} />}
              {st === "dispute" && <Icon name="warning" size={compact ? 10 : 12} strokeWidth={3} />}
            </Comp>
          );
        })}
      </div>
    </div>
  );
}
