"use client";

import { dayLong, formatDayMonth, weekdayOf } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { todayProgress } from "@/lib/ledger";
import { useStore } from "@/lib/store";
import { HEADER_CLASS, MobileTopRow } from "@/components/household/PageHeader";
import { PendingCard } from "@/components/household/PendingList";
import { TodayStatusRow } from "@/components/household/TodayStatusRow";
import { WeekStrip } from "@/components/household/WeekStrip";
import { WorkerCard } from "@/components/household/WorkerCard";
import { StateIcon } from "@/components/ui/StateIcon";
import Link from "next/link";

export default function TodayPage() {
  const { t, lang } = useI18n();
  const { state } = useStore();
  const workers = state.workers.filter((w) => !w.endDate);
  const progress = todayProgress(state);
  const left = progress.total - progress.filled;

  return (
    <div className="lg:flex lg:min-h-dvh lg:flex-col lg:gap-4 lg:p-5">
      <header className={`${HEADER_CLASS} gap-4 pb-[76px] lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-6`}>
        <MobileTopRow />
        <div>
          <div className="text-[15px] font-semibold text-muted">{t("home.greeting", { name: state.household.ownerName })}</div>
          <div className="font-display text-[38px] font-extrabold leading-none tracking-[-0.04em] lg:text-[40px]">
            <span className="lg:hidden">{t("home.dateToday", { date: formatDayMonth(state.today, lang) })}</span>
            <span className="hidden lg:inline">
              {dayLong(lang)[weekdayOf(state.today)]}, {formatDayMonth(state.today, lang)}
            </span>
          </div>
          <div className="mt-4 hidden gap-2.5 lg:flex">
            <Link href="/inbox" className="flex h-12 items-center gap-2.5 rounded-3xl bg-surface pr-4 pl-1.5">
              <StateIcon state={left > 0 ? "claim" : "present"} size={36} />
              <span className="font-extrabold">
                {left === 0 ? t("home.pendingNone") : left === 1 ? t("home.pendingPillOne") : t("home.pendingPill", { count: left })}
              </span>
              {left > 0 && (
                <span className="text-[13px] text-muted">
                  {t("home.pendingDetail", { claims: progress.claims, unknown: progress.unknown })}
                </span>
              )}
            </Link>
          </div>
        </div>
        <WeekStrip cellClassName="h-16 lg:h-[78px]" />
      </header>

      <div className="-mt-[54px] flex flex-col gap-3.5 px-4 lg:mt-0 lg:grid lg:flex-1 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4 lg:px-0">
        <div className="lg:hidden">
          <TodayStatusRow />
        </div>
        <div className="mt-1 flex items-baseline justify-between lg:hidden">
          <div className="font-display text-[22px] font-extrabold tracking-[-0.02em]">{t("home.workers")}</div>
          <div className="text-[13px] font-bold text-muted">{t("home.activeCount", { count: workers.length })}</div>
        </div>
        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-2 lg:content-start">
          {workers.map((w) => (
            <WorkerCard key={w.id} worker={w} />
          ))}
        </div>
        <div className="hidden lg:block lg:self-stretch">
          <PendingCard />
        </div>
      </div>
    </div>
  );
}
