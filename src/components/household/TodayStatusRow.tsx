"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { dayInfo, todayProgress } from "@/lib/ledger";
import { useStore } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StateIcon } from "@/components/ui/StateIcon";

/** "Today's status" card: one avatar per worker with a state badge. */
export function TodayStatusRow() {
  const { t } = useI18n();
  const { state } = useStore();
  const workers = state.workers.filter((w) => !w.endDate);
  const progress = todayProgress(state);
  const left = progress.total - progress.filled;

  return (
    <Card padding="none" className="px-3.5 pt-3.5 pb-4">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="font-extrabold">{t("home.todayStatus")}</div>
        <Link href="/inbox" className="flex items-center gap-0.5 text-[13px] font-extrabold text-coral">
          {left > 0 ? t("home.remaining", { count: left }) : t("home.pendingNone")}
          <Icon name="chevronRight" size={14} />
        </Link>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(workers.length, 1)}, minmax(0, 1fr))` }}>
        {workers.map((w) => {
          const info = dayInfo(state, w, state.today);
          return (
            <Link key={w.id} href={`/workers/${w.id}`} className="flex flex-col items-center gap-1.5">
              <div className="relative">
                <Avatar initial={w.name[0]} tone={w.tone} size={52} />
                <span className="absolute -right-1.5 -bottom-1.5 flex rounded-full border-[3px] border-surface bg-surface">
                  <StateIcon state={info.state} size={22} />
                </span>
              </div>
              <span className="text-xs font-bold">{w.name}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
