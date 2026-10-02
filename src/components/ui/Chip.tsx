import { cn } from "@/lib/cn";
import type { DayState } from "@/lib/types";
import { StateIcon } from "./StateIcon";

interface StateChipProps {
  state: DayState;
  label: string;
  className?: string;
}

const BG: Record<DayState, string> = {
  present: "bg-present-bg",
  leave: "bg-leave-bg",
  claim: "bg-claim-bg",
  dispute: "bg-dispute-bg",
  unknown: "bg-surface-2",
  off: "bg-surface-2",
};

/** The 36px status pill used on worker cards: icon badge + label. */
export function StateChip({ state, label, className }: StateChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full pr-3.5 pl-[5px] text-[13px] font-bold text-ink-2",
        BG[state],
        className,
      )}
    >
      <StateIcon state={state} size={26} />
      {label}
    </span>
  );
}
