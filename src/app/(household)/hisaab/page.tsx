"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDayMonth, formatMonthLong, monthOf } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { monthSummary, pastSettlements } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { useStore } from "@/lib/store";
import { HEADER_CLASS, MobileTopRow } from "@/components/household/PageHeader";
import { MonthPicker } from "@/components/household/MonthPicker";
import { ResolveRow } from "@/components/household/ResolveRow";
import { SettlementBreakdown } from "@/components/household/SettlementBreakdown";
import { WorkerSwitcher } from "@/components/household/WorkerSwitcher";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StateIcon } from "@/components/ui/StateIcon";

function HisaabScreen() {
  const { t, lang } = useI18n();
  const { state, dispatch } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const workers = state.workers.filter((w) => !w.endDate);
  const thisMonth = monthOf(state.today);

  const paramWorker = params.get("worker");
  const [workerId, setWorkerId] = useState(
    paramWorker && workers.some((w) => w.id === paramWorker) ? paramWorker : workers[0]?.id,
  );
  const paramMonth = params.get("month");
  const [month, setMonth] = useState(paramMonth && /^\d{4}-\d{2}$/.test(paramMonth) && paramMonth <= thisMonth ? paramMonth : thisMonth);
  const worker = workers.find((w) => w.id === workerId) ?? workers[0];
  if (!worker) return null;

  const summary = monthSummary(state, worker, month);
  const blocked = summary.pending.length > 0;
  const settlement = summary.settlement;
  const previous = pastSettlements(state, worker.id, month);

  const selectWorker = (id: string) => {
    setWorkerId(id);
    router.replace(`/hisaab?worker=${id}`);
  };

  const StatusBanner = blocked ? (
    <div className="flex items-center gap-3 rounded-3xl bg-dispute-bg px-3.5 py-3">
      <StateIcon state="dispute" size={34} />
      <div className="leading-[1.25]">
        <div className="font-extrabold text-dispute-fg">{t("hisaab.blockedTitle", { count: summary.pending.length })}</div>
        <div className="text-xs font-semibold text-dispute-fg/80">{t("hisaab.blockedSub")}</div>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-3 rounded-3xl bg-present-cell px-3.5 py-3">
      <StateIcon state="present" size={34} />
      <div className="leading-[1.25]">
        <div className="font-extrabold text-present-fg">{t("hisaab.allFilledTitle")}</div>
        <div className="text-xs font-semibold text-present-sub">{t("hisaab.allFilledSub")}</div>
      </div>
    </div>
  );

  const FinalizeArea = settlement?.finalizedAt ? (
    <Card padding="md" className="flex items-center gap-3">
      <StateIcon state="present" size={34} />
      <div className="flex-1 leading-tight">
        <div className="font-extrabold">{t("hisaab.finalized", { amount: formatINR(settlement.amountDue) })}</div>
        <div className="text-xs text-muted">
          {settlement.paidAt ? t("hisaab.paidOn", { date: formatDayMonth(settlement.paidAt.slice(0, 10), lang) }) : t("common.unpaid")}
        </div>
      </div>
      {!settlement.paidAt && (
        <Button size="sm" onClick={() => dispatch({ type: "markPaid", workerId: worker.id, month })}>
          {t("hisaab.markPaid")}
        </Button>
      )}
    </Card>
  ) : (
    <Button
      size="xl"
      block
      disabled={blocked}
      onClick={() => dispatch({ type: "finalize", workerId: worker.id, month, amountDue: summary.amountDue })}
    >
      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-present-icon text-present-fg">
        <Icon name="check" size={14} strokeWidth={3.4} />
      </span>
      {t("hisaab.finalize", { amount: formatINR(summary.amountDue) })}
    </Button>
  );

  return (
    <div className="lg:flex lg:min-h-dvh lg:flex-col lg:gap-4 lg:p-5">
      <header className={`${HEADER_CLASS} gap-3.5 pb-[70px]`}>
        <MobileTopRow title={t("hisaab.title")} />
        <div className="flex items-center justify-between">
          <div className="hidden font-display text-[30px] font-extrabold tracking-[-0.04em] lg:block">{t("hisaab.title")}</div>
          <WorkerSwitcher workers={workers} value={worker.id} onChange={selectWorker} />
          <MonthPicker value={month} latest={thisMonth} onChange={setMonth} />
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-2.5">
          <div>
            <div className="text-sm font-bold text-muted">{t("hisaab.toPay", { name: worker.name })}</div>
            <div className="font-display text-[54px] font-extrabold leading-none tracking-[-0.05em] tabular">
              {formatINR(summary.amountDue)}
            </div>
          </div>
          <span
            className={
              blocked
                ? "inline-flex h-8 items-center gap-1.5 rounded-2xl bg-surface pr-3 pl-1 text-xs font-extrabold text-dispute-fg"
                : "inline-flex h-8 items-center gap-1.5 rounded-2xl bg-surface pr-3 pl-1 text-xs font-extrabold text-present-fg"
            }
          >
            <StateIcon state={blocked ? "dispute" : "present"} size={24} />
            {blocked ? t("hisaab.blockedTitle", { count: summary.pending.length }) : t("hisaab.allFilled")}
          </span>
        </div>
      </header>

      <div className="-mt-11 flex flex-col gap-3.5 px-4 lg:mt-0 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-4 lg:px-0">
        <div className="flex flex-col gap-3.5">
          {StatusBanner}
          {blocked && (
            <Card padding="none" className="px-[18px] py-1">
              {summary.pending.map((item, i) => (
                <ResolveRow key={item.date} item={item} className={i > 0 ? "border-t border-line" : ""} />
              ))}
            </Card>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[22px] bg-av-purple p-3">
              <div className="text-xs font-bold text-muted">{t("hisaab.workingDays")}</div>
              <div className="font-display text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em]">{summary.workingDays}</div>
            </div>
            <div className="rounded-[22px] bg-present-cell p-3">
              <div className="text-xs font-bold text-muted">{t("hisaab.present", { gender: worker.gender })}</div>
              <div className="font-display text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em]">{summary.present}</div>
            </div>
            <div className="rounded-[22px] bg-av-blue p-3">
              <div className="text-xs font-bold text-muted">{t("hisaab.leave")}</div>
              <div className="font-display text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em]">{summary.leave}</div>
              <div className="text-[10px] font-semibold text-muted">
                {t("hisaab.leaveDetail", { free: summary.paidLeaveUsed, unpaid: summary.unpaidLeave })}
              </div>
            </div>
          </div>
          <SettlementBreakdown summary={summary} workerName={worker.name} gender={worker.gender} />
          {FinalizeArea}
        </div>

        <Card padding="none" className="px-[18px] py-1.5">
          <div className="pt-2.5 pb-0.5 font-extrabold">{t("hisaab.previous")}</div>
          {previous.length === 0 ? (
            <div className="py-3 text-sm text-muted">—</div>
          ) : (
            previous.map((s, i) => (
              <div key={s.month} className={`flex items-center gap-2.5 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                <span className="flex-1 font-semibold">{formatMonthLong(s.month, lang)}</span>
                <span
                  className={
                    s.paidAt
                      ? "inline-flex h-6 items-center gap-1 rounded-xl bg-present-cell px-2.5 text-[11px] font-extrabold text-present-fg"
                      : "inline-flex h-6 items-center gap-1 rounded-xl bg-claim-icon px-2.5 text-[11px] font-extrabold text-claim-fg"
                  }
                >
                  {s.paidAt && <Icon name="check" size={10} strokeWidth={4} />}
                  {s.paidAt ? t("common.paid") : t("common.unpaid")}
                </span>
                <span className="w-[72px] text-right font-display font-bold tabular">{formatINR(s.amountDue)}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}

export default function HisaabPage() {
  return (
    <Suspense>
      <HisaabScreen />
    </Suspense>
  );
}
