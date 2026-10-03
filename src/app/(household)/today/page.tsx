"use client";

import { dayLong, formatMonthLong, monthOf, weekdayOf, dayOfMonth } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { todayProgress } from "@/lib/ledger";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { pendingItems } from "@/lib/ledger";
import { HEADER_CLASS, HeaderIconButton, MobileTopRow, SHEET_CLASS } from "@/components/household/PageHeader";
import { PendingCard } from "@/components/household/PendingList";
import { TodayRegister } from "@/components/household/TodayRegister";
import { TodayStatusRow } from "@/components/household/TodayStatusRow";
import { WeekStrip } from "@/components/household/WeekStrip";
import { WorkerCard } from "@/components/household/WorkerCard";
import { PushPrompt } from "@/components/pwa/PushPrompt";

export default function TodayPage() {
  const { t, lang } = useI18n();
  const { state } = useStore();
  const { toggle } = useTheme();
  const workers = state.workers.filter((w) => !w.endDate);
  const progress = todayProgress(state);
  const left = progress.total - progress.filled;
  const today = state.today;
  const fullDate = `${dayLong(lang)[weekdayOf(today)]} · ${dayOfMonth(today)} ${formatMonthLong(monthOf(today), lang)} ${today.slice(0, 4)}`;
  const parts = [
    progress.claims > 0 && t("home.pendingClaims", { count: progress.claims }),
    progress.unknown > 0 && t("home.pendingUnknown", { count: progress.unknown }),
  ].filter(Boolean);
  const stop = lang === "hi" ? "।" : ".";
  const summary =
    left === 0
      ? `${t("home.pendingNone")}${stop}`
      : `${left === 1 ? t("home.pendingPillOne") : t("home.pendingPill", { count: left })}${parts.length ? ` — ${parts.join(", ")}` : ""}${stop}`;
  const firstName = state.household.ownerName.split(" ")[0];

  return (
    <div className="lg:flex lg:min-h-dvh lg:flex-col">
      <header className={`${HEADER_CLASS} pb-[84px] lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:gap-10`}>
        <MobileTopRow />
        <div className="mt-[34px] lg:mt-0">
          <div className="label-caps">{fullDate}</div>
          <h1 className="mt-2.5 font-display text-[54px] leading-[0.98] tracking-[-0.035em] lg:mt-3 lg:text-[68px] lg:leading-[0.95] lg:tracking-[-0.04em]">
            {t("home.hello")}
            <br className="lg:hidden" /> <i>{firstName}.</i>
          </h1>
          <p className="mt-3 max-w-[290px] font-display text-[19px] leading-[1.35] text-muted lg:mt-2.5 lg:max-w-none lg:text-[21px]">
            {summary}
          </p>
        </div>
        <div className="mt-[22px] lg:mt-0">
          <div className="mb-2.5 hidden items-center justify-between lg:flex">
            <span className="label-caps">{t("home.thisWeek")}</span>
            <div className="flex gap-2">
              <HeaderIconButton icon="contrast" onClick={toggle} label={t("nav.theme")} />
              <HeaderIconButton icon="bell" href="/inbox" badge={pendingItems(state).length} label={t("nav.inbox")} />
            </div>
          </div>
          <WeekStrip className="pt-3.5 lg:pt-2.5" />
        </div>
      </header>

      {/* Phone and tablet */}
      <div className={`${SHEET_CLASS} -mt-14 pb-6 lg:hidden`}>
        <TodayStatusRow />
        <PushPrompt target={{ kind: "household" }} className="mt-6" />
        <div className="mt-[30px] flex items-baseline justify-between border-b border-ink pb-2.5">
          <span className="label-caps text-ink">{t("home.workers")}</span>
          <span className="label-caps tabular">{String(workers.length).padStart(2, "0")}</span>
        </div>
        {workers.map((w, i) => (
          <WorkerCard key={w.id} worker={w} className={i > 0 ? "border-t border-line" : ""} />
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 px-10 py-[26px]">
          <PushPrompt target={{ kind: "household" }} className="mb-6" />
          <TodayRegister />
        </div>
        <div className="border-l border-line px-7 py-[26px]">
          <PendingCard />
        </div>
      </div>
    </div>
  );
}
