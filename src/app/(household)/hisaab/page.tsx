"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDayMonth, formatMonthLong, monthOf } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { monthSummary, pastSettlements } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { useAct, useStore } from "@/lib/store";
import { DesktopTitle, HEADER_CLASS, SHEET_CLASS, Wordmark } from "@/components/household/PageHeader";
import { MonthPicker } from "@/components/household/MonthPicker";
import { ResolveRow } from "@/components/household/ResolveRow";
import { SettlementBreakdown } from "@/components/household/SettlementBreakdown";
import { WorkerSwitcher } from "@/components/household/WorkerSwitcher";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StateIcon } from "@/components/ui/StateIcon";

function HisaabScreen() {
  const { t, lang } = useI18n();
  const { state } = useStore();
  const act = useAct();
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

  const status = blocked ? t("hisaab.blockedTitle", { count: summary.pending.length }) : t("hisaab.allFilledTitle");

  const FinalizeArea = settlement?.finalizedAt ? (
    <div className="flex items-center gap-3 border-y border-line py-3.5">
      <StateIcon state="present" size={26} />
      <div className="flex-1 leading-tight">
        <div className="font-display text-xl">{t("hisaab.finalized", { amount: formatINR(settlement.amountDue) })}</div>
        <div className="mt-0.5 text-xs text-muted">
          {settlement.paidAt ? t("hisaab.paidOn", { date: formatDayMonth(settlement.paidAt.slice(0, 10), lang) }) : t("common.unpaid")}
        </div>
      </div>
      {!settlement.paidAt && (
        <Button size="sm" {...act({ type: "markPaid", workerId: worker.id, month })}>
          {t("hisaab.markPaid")}
        </Button>
      )}
    </div>
  ) : (
    <Button
      size="xl"
      block
      {...act({ type: "finalize", workerId: worker.id, month, amountDue: summary.amountDue }, { disabled: blocked })}
    >
      {t("hisaab.finalize", { amount: formatINR(summary.amountDue) })}
    </Button>
  );

  return (
    <div className="lg:flex lg:min-h-dvh lg:flex-col">
      <header className={`${HEADER_CLASS} pb-20`}>
        <div className="flex items-center gap-2.5">
          <Link href="/today" className="flex-1 lg:hidden">
            <Wordmark className="text-[22px]" />
          </Link>
          <DesktopTitle>{t("hisaab.title")}</DesktopTitle>
          <div className="hidden flex-1 lg:block" />
          <MonthPicker value={month} latest={thisMonth} onChange={setMonth} />
        </div>
        <h1 className="mt-[26px] font-display text-[40px] leading-none tracking-[-0.03em] lg:hidden">{t("hisaab.title")}</h1>
        <WorkerSwitcher workers={workers} value={worker.id} onChange={selectWorker} />
        <div className="label-caps mt-[26px]">{t("hisaab.toPay", { name: worker.name })}</div>
        <div className="mt-1.5 font-display text-[76px] leading-none tracking-[-0.04em] tabular">{formatINR(summary.amountDue)}</div>
        <div className={`mt-3 flex items-center gap-2 text-[13px] font-semibold ${blocked ? "text-dispute-fg" : ""}`}>
          <StateIcon state={blocked ? "dispute" : "present"} size={20} />
          {status}
        </div>
      </header>

      <div className={`${SHEET_CLASS} -mt-[52px] pb-6 lg:pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-12`}>
        <div className="flex flex-col">
          {blocked && (
            <section className="mb-6">
              <div className="label-caps text-dispute-fg">{t("hisaab.blockedSub")}</div>
              <div className="mt-2">
                {summary.pending.map((item, i) => (
                  <ResolveRow key={item.date} item={item} className={i > 0 ? "border-t border-line" : ""} />
                ))}
              </div>
            </section>
          )}
          <SettlementBreakdown summary={summary} workerName={worker.name} gender={worker.gender} className="mb-[18px]" />
          {FinalizeArea}
        </div>

        <section className="mt-[30px] lg:mt-0">
          <div className="label-caps mb-1.5">{t("hisaab.previous")}</div>
          {previous.length === 0 ? (
            <div className="py-3 text-sm text-muted">—</div>
          ) : (
            previous.map((s, i) => (
              <div key={s.month} className={`flex items-baseline gap-3 py-[13px] ${i > 0 ? "border-t border-line" : ""}`}>
                <span className="flex-1 font-display text-xl">{formatMonthLong(s.month, lang)}</span>
                <span
                  className={`inline-flex items-center gap-[5px] text-[10px] font-bold tracking-[0.18em] uppercase ${s.paidAt ? "text-present-fg" : "text-claim-fg"}`}
                >
                  {s.paidAt && <Icon name="check" size={10} strokeWidth={3.4} />}
                  {s.paidAt ? t("common.paid") : t("common.unpaid")}
                </span>
                <span className="w-[76px] text-right font-display text-xl tabular">{formatINR(s.amountDue)}</span>
              </div>
            ))
          )}
        </section>
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
