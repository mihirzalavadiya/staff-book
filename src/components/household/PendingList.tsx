"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatDayMonth, formatMonthLong, formatTime } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { monthSummary, pendingItems, type PendingItem } from "@/lib/ledger";
import { useStore } from "@/lib/store";
import { monthOf } from "@/lib/date";
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
      className={cn("flex items-start gap-3 py-3.5", className)}
    >
      <StateIcon state={item.info.state} size={26} />
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2">
          <span className="truncate font-display text-[19px] leading-[1.1]">{item.worker.name}</span>
          <span className="label-caps flex-none text-[9.5px]">{isToday ? t("common.todayLabel") : formatDayMonth(item.date, lang)}</span>
        </div>
        <div className="mt-[3px] truncate text-[12.5px] text-muted">{pendingLine(item, t)}</div>
      </div>
    </Link>
  );
}

/** "Pending" column for the desktop home: what needs you, then the month's blocked salary. */
export function PendingCard({ limit = 4 }: { limit?: number }) {
  const { t, lang } = useI18n();
  const { state } = useStore();
  const items = pendingItems(state);
  const month = monthOf(state.today);
  const blocked = state.workers
    .filter((w) => !w.endDate)
    .map((w) => ({ w, s: monthSummary(state, w, month) }))
    .filter((x) => x.s.pending.length > 0)
    .sort((a, b) => b.s.pending.length - a.s.pending.length)[0];

  return (
    <section className="flex h-full flex-col">
      <div className="flex items-baseline justify-between border-b border-ink pb-2.5">
        <Link href="/inbox" className="font-display text-[30px] leading-none tracking-[-0.02em]">
          {t("home.pendingTitle")}
        </Link>
        <span className="label-caps tabular">{String(items.length).padStart(2, "0")}</span>
      </div>
      {items.length === 0 ? (
        <div className="py-4 text-sm text-muted">{t("inbox.empty")}</div>
      ) : (
        items.slice(0, limit).map((item, i) => (
          <PendingRow key={`${item.worker.id}-${item.date}`} item={item} className={i > 0 ? "border-t border-line" : ""} />
        ))
      )}
      {blocked && (
        <Link href={`/hisaab?worker=${blocked.w.id}`} className="mt-auto border-t border-ink pt-4">
          <div className="label-caps text-[9.5px]">{t("home.monthHisaab", { month: formatMonthLong(month, lang) })}</div>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="truncate font-display text-[22px] text-dispute-fg">
              {blocked.w.name} · {t("home.daysPending", { count: blocked.s.pending.length })}
            </span>
            <span className="flex flex-none items-center gap-1 text-xs font-semibold text-coral">
              {t("home.fill")}
              <Icon name="chevronRight" size={12} />
            </span>
          </div>
        </Link>
      )}
    </section>
  );
}
