"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { dayInfo, todayProgress } from "@/lib/ledger";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { StateIcon } from "@/components/ui/StateIcon";

/** "Today's status": one avatar per worker with a state badge, split by hairlines. */
export function TodayStatusRow() {
  const { t } = useI18n();
  const { state } = useStore();
  const workers = state.workers.filter((w) => !w.endDate);
  const progress = todayProgress(state);
  const left = progress.total - progress.filled;

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <div className="label-caps">{t("home.todayStatus")}</div>
        <Link href="/inbox" className="flex items-center gap-1 text-xs font-semibold text-coral">
          {left > 0 ? t("home.remaining", { count: left }) : t("home.pendingNone")}
          <Icon name="chevronRight" size={12} />
        </Link>
      </div>
      <div className="mt-4 grid" style={{ gridTemplateColumns: `repeat(${Math.max(workers.length, 1)}, minmax(0, 1fr))` }}>
        {workers.map((w, i) => (
          <Link
            key={w.id}
            href={`/workers/${w.id}`}
            className={cn("flex min-w-0 flex-col items-center gap-2", i > 0 && "border-l border-line")}
          >
            <div className="relative">
              <Avatar initial={w.name[0]} tone={w.tone} size={50} />
              <span className="absolute -right-[5px] -bottom-1 flex rounded-full bg-bg p-0.5">
                <StateIcon state={dayInfo(state, w, state.today).state} size={20} />
              </span>
            </div>
            <span className="max-w-full truncate px-1 text-xs font-semibold">{w.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
