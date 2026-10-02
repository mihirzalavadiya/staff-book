"use client";

import { cn } from "@/lib/cn";
import type { Worker } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";

interface Props {
  workers: Worker[];
  value: string;
  onChange: (id: string) => void;
}

/** Row of avatars; the selected one expands into a pill with the name. */
export function WorkerSwitcher({ workers, value, onChange }: Props) {
  return (
    <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [mask-image:linear-gradient(to_right,black_88%,transparent)] sm:[mask-image:none]">
      {workers.map((w) => {
        const active = w.id === value;
        return (
          <button
            key={w.id}
            type="button"
            onClick={() => onChange(w.id)}
            aria-pressed={active}
            className={cn(
              "flex h-11 flex-none items-center rounded-[22px] font-bold",
              active ? "gap-2 bg-surface pr-4 pl-1 text-ink" : "",
            )}
          >
            <Avatar initial={w.name[0]} tone={w.tone} size={active ? 36 : 44} shape="circle" />
            {active && <span>{w.name}</span>}
          </button>
        );
      })}
    </div>
  );
}
