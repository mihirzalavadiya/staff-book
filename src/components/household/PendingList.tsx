"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatDayMonth, formatTime } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { monthSummary, pendingItems, type PendingItem } from "@/lib/ledger";
import { useStore } from "@/lib/store";
import { monthOf } from "@/lib/date";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StateIcon } from "@/components/ui/StateIcon";

type T = (key: string, vars?: Record<string, string | number>) => string;

function pendingLine({ info, worker, reminder }: PendingItem, t: T): string {
  const g = { gender: worker.gender };
  if (reminder) return t("inbox.remindedLine", { name: worker.name, time: formatTime(reminder.at), ...g });
  if (info.state === "dispute") return t("home.disputeSummary", { name: worker.name, ...g });
  if (info.state === "claim" && info.entry) return `${t("state.present", g)} · ${formatTime(info.entry.at)}`;
  return t("home.nobodyMarked");
}

function PendingRow({ item, className }: { item: PendingItem; className?: string }) {
  const { t, lang } = useI18n();
  const { state } = useStore();
  const isToday = item.date === state.today;
  return (
    <Link
      href={`/calendar?worker=${item.worker.id}&date=${item.date}`}
      className={cn("flex items-center gap-3 py-[11px]", className)}
    >
      <StateIcon state={item.info.state} size={34} />
      <div className="min-w-0 flex-1 leading-[1.3]">
        <div className="font-bold">
          {item.worker.name} · {isToday ? t("common.todayLabel") : formatDayMonth(item.date, lang)}
        </div>
        <div className="truncate text-xs text-muted">{pendingLine(item, t)}</div>
      </div>
      <Icon name="chevronRight" size={16} className="flex-none" />
    </Link>
  );
}

/** Compact "Pending" card for the desktop home right column. */
export function PendingCard({ limit = 4 }: { limit?: number }) {
  const { t } = useI18n();
  const { state } = useStore();
  const items = pendingItems(state);
  const month = monthOf(state.today);
  const blocked = state.workers
    .filter((w) => !w.endDate)
    .map((w) => ({ w, s: monthSummary(state, w, month) }))
    .filter((x) => x.s.pending.length > 0)
    .sort((a, b) => b.s.pending.length - a.s.pending.length)[0];

  return (
    <Card padding="none" className="flex flex-col gap-1 px-[18px] py-4">
      <div className="flex items-center justify-between">
        <div className="text-base font-extrabold">{t("home.pendingTitle")}</div>
        <Link href="/inbox" className="text-xs font-extrabold text-coral">
          {t("common.viewAll")} →
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="py-4 text-sm text-muted">{t("inbox.empty")}</div>
      ) : (
        items.slice(0, limit).map((item, i) => (
          <PendingRow key={`${item.worker.id}-${item.date}`} item={item} className={i > 0 ? "border-t border-line" : ""} />
        ))
      )}
      {blocked && (
        <Link
          href={`/hisaab?worker=${blocked.w.id}`}
          className="mt-auto flex items-center gap-2.5 rounded-[18px] bg-dispute-bg px-3.5 py-3 text-[13px] font-bold text-dispute-fg"
        >
          <Icon name="warning" size={16} />
          {t("home.hisaabPending", { name: blocked.w.name, count: blocked.s.pending.length })}
        </Link>
      )}
    </Card>
  );
}
