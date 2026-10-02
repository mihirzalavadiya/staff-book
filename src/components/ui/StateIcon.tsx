import { cn } from "@/lib/cn";
import type { DayState } from "@/lib/types";
import { Icon } from "./Icon";

interface StateIconProps {
  state: DayState;
  /** Outer circle diameter in px. */
  size?: number;
  className?: string;
}

const TONE: Record<Exclude<DayState, "unknown" | "off">, string> = {
  present: "bg-present-icon text-present-fg",
  leave: "bg-leave-icon text-leave-fg",
  claim: "bg-claim-icon text-claim-fg",
  dispute: "bg-dispute-icon text-dispute-fg",
};

/**
 * Round badge that carries a day state by icon and colour.
 * Tick = came, cross = leave, question = claim, triangle = dispute, dashed box = not marked.
 */
export function StateIcon({ state, size = 26, className }: StateIconProps) {
  const style = { width: size, height: size };
  if (state === "unknown" || state === "off") {
    return (
      <span
        style={style}
        className={cn(
          "flex flex-none items-center justify-center rounded-full border-2 border-dashed border-unknown-fg",
          className,
        )}
      >
        <span
          style={{ width: Math.round(size * 0.31), height: Math.round(size * 0.31) }}
          className="rounded-[2px] border-[1.5px] border-dashed border-unknown-fg"
        />
      </span>
    );
  }
  const icon = state === "present" ? "check" : state === "leave" ? "x" : state === "claim" ? "question" : "warning";
  const inner =
    state === "present"
      ? Math.round(size * 0.54)
      : state === "leave"
        ? Math.round(size * 0.46)
        : Math.round(size * 0.54);
  const sw = state === "present" || state === "leave" ? 3.4 : state === "claim" ? 3.2 : 2.8;
  return (
    <span
      style={style}
      className={cn("flex flex-none items-center justify-center rounded-full", TONE[state], className)}
    >
      <Icon name={icon} size={inner} strokeWidth={sw} />
    </span>
  );
}
