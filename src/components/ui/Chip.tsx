import { cn } from "@/lib/cn";
import type { DayState } from "@/lib/types";
import { StateIcon } from "./StateIcon";

interface StateChipProps {
  state: DayState;
  label: string;
  className?: string;
}

/** Status line used on worker rows: round icon badge + label, no pill. */
export function StateChip({ state, label, className }: StateChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold text-ink",
        className,
      )}
    >
      <StateIcon state={state} size={22} />
      {label}
    </span>
  );
}
