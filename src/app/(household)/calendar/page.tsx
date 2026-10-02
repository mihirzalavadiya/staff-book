"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDayMonth, monthOf } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { formatINR } from "@/lib/money";
import { useStore } from "@/lib/store";
import type { DayState } from "@/lib/types";
import { DayDetail } from "@/components/household/DayDetail";
import { MonthGrid } from "@/components/household/MonthGrid";
import { MonthPicker } from "@/components/household/MonthPicker";
import { HEADER_CLASS, MobileTopRow } from "@/components/household/PageHeader";
import { WorkerSwitcher } from "@/components/household/WorkerSwitcher";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { StateIcon } from "@/components/ui/StateIcon";

const LEGEND: DayState[] = ["present", "leave", "claim", "dispute", "unknown"];

function CalendarScreen() {
  const { t, lang } = useI18n();
  const { state, dispatch } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const workers = state.workers.filter((w) => !w.endDate);
  const thisMonth = monthOf(state.today);

  const paramWorker = params.get("worker");
  const paramDate = params.get("date");
  const [workerId, setWorkerId] = useState(
    paramWorker && workers.some((w) => w.id === paramWorker) ? paramWorker : workers[0]?.id,
  );
  const [month, setMonth] = useState(paramDate ? monthOf(paramDate) : thisMonth);
  const [selected, setSelected] = useState<string | undefined>(paramDate ?? undefined);
  const [sheetOpen, setSheetOpen] = useState(Boolean(paramDate));
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [advDate, setAdvDate] = useState(state.today);
  const [note, setNote] = useState("");

  const worker = workers.find((w) => w.id === workerId) ?? workers[0];
  if (!worker) return null;

  const advances = state.advances.filter((a) => a.workerId === worker.id && monthOf(a.date) === month);

  const selectWorker = (id: string) => {
    setWorkerId(id);
    setSelected(undefined);
    router.replace(`/calendar?worker=${id}`);
  };
  const selectDay = (date: string) => {
    setSelected(date);
    setSheetOpen(true);
  };
  const submitAdvance = () => {
    const n = Number(amount);
    if (!n || n <= 0) return;
    dispatch({ type: "addAdvance", workerId: worker.id, amount: n, date: advDate, note: note || undefined });
    setAmount("");
    setNote("");
    setAdvanceOpen(false);
  };

  return (
    <div className="lg:flex lg:min-h-dvh lg:flex-col lg:gap-4 lg:p-5">
      <header className={`${HEADER_CLASS} gap-3.5 pb-[70px]`}>
        <MobileTopRow title={t("calendar.title")} />
        <div className="flex items-center justify-between gap-2">
          <div className="hidden font-display text-[30px] font-extrabold tracking-[-0.04em] lg:block">{t("calendar.title")}</div>
          <WorkerSwitcher workers={workers} value={worker.id} onChange={selectWorker} />
          <MonthPicker value={month} latest={thisMonth} onChange={setMonth} />
        </div>
      </header>

      <div className="-mt-11 flex flex-col gap-3.5 px-4 lg:mt-0 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-4 lg:px-0">
        <div className="flex flex-col gap-3.5">
          <Card padding="none" radius={28} className="px-4 pt-4 pb-3.5">
            <MonthGrid worker={worker} month={month} selected={selected} onSelect={selectDay} />
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-3">
              {LEGEND.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                  <StateIcon state={s} size={18} />
                  {t(`state.${s}`, { gender: worker.gender })}
                </span>
              ))}
            </div>
          </Card>

          <Card padding="none" className="px-[18px] py-1.5">
            <div className="flex items-center justify-between py-2.5">
              <div className="font-extrabold">{t("calendar.advances")}</div>
              <Button size="sm" onClick={() => setAdvanceOpen(true)}>
                <Icon name="plus" size={12} />
                {t("calendar.addAdvance")}
              </Button>
            </div>
            {advances.length === 0 ? (
              <div className="pb-3 text-sm text-muted">{t("calendar.noAdvances")}</div>
            ) : (
              advances.map((a) => (
                <div key={a.id} className="flex items-center gap-3 border-t border-line py-3">
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-av-yellow text-ink">
                    <Icon name="rupee" size={16} />
                  </span>
                  <div className="flex-1 leading-tight">
                    <div className="font-bold">{formatDayMonth(a.date, lang)}</div>
                    {a.note && <div className="text-xs text-muted">{a.note}</div>}
                  </div>
                  <span className="font-display font-bold tabular">{formatINR(a.amount)}</span>
                </div>
              ))
            )}
          </Card>
        </div>

        <Card padding="lg" className="hidden lg:block">
          {selected ? (
            <DayDetail worker={worker} date={selected} />
          ) : (
            <div className="py-6 text-center text-sm text-muted">{t("calendar.editWindow")}</div>
          )}
        </Card>
      </div>

      <div className="lg:hidden">
        <Sheet open={sheetOpen && Boolean(selected)} onClose={() => setSheetOpen(false)}>
          {selected && <DayDetail worker={worker} date={selected} />}
        </Sheet>
      </div>

      <Sheet open={advanceOpen} onClose={() => setAdvanceOpen(false)} title={t("calendar.addAdvance")}>
        <div className="flex flex-col gap-3">
          <Field label={t("calendar.addAdvance")} prefix="₹" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" />
          <Field label={t("common.todayLabel")} type="date" value={advDate} onChange={(e) => setAdvDate(e.target.value)} />
          <Field label={`${t("calendar.history")} (${t("common.optional")})`} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="xl" block onClick={submitAdvance} disabled={!Number(amount)}>
            <Icon name="check" size={16} />
            {t("common.add")}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarScreen />
    </Suspense>
  );
}
