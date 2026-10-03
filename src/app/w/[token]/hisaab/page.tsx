"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatDayMonth, formatMonthLong, monthOf } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { monthSummary } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { roleName } from "@/lib/roles";
import { useAct, useStore } from "@/lib/store";
import { MonthGrid } from "@/components/household/MonthGrid";
import { SettlementBreakdown } from "@/components/household/SettlementBreakdown";
import { WorkerHeader } from "@/components/worker/WorkerShell";
import { WorkerTopRow } from "@/components/worker/WorkerTopRow";
import { useWorkerLink } from "@/components/worker/WorkerStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StateIcon } from "@/components/ui/StateIcon";

export default function WorkerHisaabPage() {
  const { t, lang } = useI18n();
  const { state } = useStore();
  const act = useAct();
  const { token, me, houses: engagements } = useWorkerLink();
  const month = monthOf(state.today);
  const [open, setOpen] = useState(engagements[0]?.id ?? "");

  return (
    <div className="pb-8">
      <WorkerHeader>
        <WorkerTopRow token={token} back />
        <div className="mt-3.5 text-[19px] font-semibold text-muted">{formatMonthLong(month, lang)}</div>
        <div className="text-[36px] font-extrabold leading-[1.1]">{t("worker.hisaabTitle")}</div>
      </WorkerHeader>

      <div className="-mt-[46px] flex flex-col gap-3.5 px-4">
        {engagements.map((e) => {
          const engagement = state.workers.find((w) => w.id === e.id);
          if (!engagement) return null;
          const s = monthSummary(state, engagement, month);
          const isOpen = open === e.id;
          const blocked = s.pending.length > 0;
          return (
            <Card key={e.id} padding="none" className="overflow-hidden">
              <button type="button" onClick={() => setOpen(isOpen ? "" : e.id)} className="flex w-full items-center gap-3 p-[18px] text-left">
                <Avatar initial={e.initial} tone={e.tone} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="text-[19px] font-extrabold leading-[1.15]">{e.houseName}</div>
                  <div className="text-[17px] font-semibold text-muted">{roleName(t, e.role, e.roleLabel)}</div>
                </div>
                <div className="text-right">
                  <div className="font-sans text-[26px] font-extrabold leading-none tracking-[-0.03em] tabular">{formatINR(s.amountDue)}</div>
                  <div className={cn("mt-1 inline-flex items-center gap-1 text-sm font-extrabold", blocked ? "text-dispute-fg" : "text-present-fg")}>
                    <StateIcon state={blocked ? "dispute" : "present"} size={18} />
                    {blocked ? t("hisaab.blockedTitle", { count: s.pending.length }) : s.settlement?.finalizedAt ? t("common.final") : t("hisaab.allFilled")}
                  </div>
                </div>
              </button>
              {isOpen && (
                <div className="flex flex-col gap-3 bg-surface-2 p-3">
                  <div className="rounded-[6px] bg-surface px-3 pt-3 pb-2.5">
                    <div className="mb-2 text-lg font-extrabold">{formatMonthLong(month, lang)}</div>
                    <MonthGrid worker={engagement} month={month} />
                  </div>
                  {blocked && (
                    <div className="flex flex-col gap-2 rounded-[6px] bg-surface p-3">
                      {s.pending.map((p) => (
                        <div key={p.date} className="flex items-center gap-3">
                          <StateIcon state={p.info.state} size={36} />
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="text-lg font-extrabold">{formatDayMonth(p.date, lang)}</div>
                            <div className="text-sm font-semibold text-muted">{p.info.state === "unknown" ? t("worker.unknownDay") : t(`state.${p.info.state}`, { gender: me.gender })}</div>
                          </div>
                          {p.info.state === "unknown" && (
                            <Button
                              size="sm"
                              className={cn("!h-11 !rounded-full !px-4 !text-sm", p.reminder ? "!bg-present-bg !text-present-fg !opacity-100" : "")}
                              {...act({ type: "remind", workerId: e.id, date: p.date }, { disabled: Boolean(p.reminder) })}
                            >
                              {p.reminder ? t("worker.reminded") : t("worker.remind")}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <SettlementBreakdown summary={s} workerName={me.name} gender={me.gender} side="worker" className="shadow-none" />
                  {s.settlement?.paidAt && (
                    <div className="flex items-center gap-2 rounded-[6px] bg-present-bg px-4 py-3 text-lg font-extrabold text-present-fg">
                      <Icon name="check" size={20} strokeWidth={3} />
                      {t("hisaab.paidOn", { date: formatDayMonth(s.settlement.paidAt.slice(0, 10), lang) })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
