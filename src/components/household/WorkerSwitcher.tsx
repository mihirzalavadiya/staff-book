"use client";

import { cn } from "@/lib/cn";
import type { Worker } from "@/lib/types";

interface Props {
  workers: Worker[];
  value: string;
  onChange: (id: string) => void;
}

/** Worker names as serif tabs over a hairline; the selected one is underlined in ink. */
export function WorkerSwitcher({ workers, value, onChange }: Props) {
  return (
    <div className="no-scrollbar mt-[18px] flex gap-5 overflow-x-auto border-b border-line-strong">
      {workers.map((w) => {
        const active = w.id === value;
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => onChange(w.id)}
            aria-pressed={active}
            className={cn(
              "-mb-px flex-none pb-2 font-display text-xl",
              active ? "border-b-[1.5px] border-ink text-ink" : "text-muted",
            )}
          >
            {w.name}
          </button>
        );
      })}
    </div>
  );
}
