"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatDayMonth, formatMonth } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { attendancePercent } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { roleName } from "@/lib/roles";
import { useStore } from "@/lib/store";
import { HEADER_CLASS, MobileTopRow } from "@/components/household/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

export default function WorkersPage() {
  const { t, lang } = useI18n();
  const { state } = useStore();
  const [tab, setTab] = useState<"active" | "archive">("active");
  const active = state.workers.filter((w) => !w.endDate);
  const archived = state.workers.filter((w) => w.endDate);
  const list = tab === "active" ? active : archived;

  return (
    <div className="lg:flex lg:min-h-dvh lg:flex-col lg:gap-4 lg:p-5">
      <header className={`${HEADER_CLASS} gap-3.5 pb-[70px]`}>
        <MobileTopRow title={t("workers.title")} />
        <div className="flex items-center justify-between gap-3">
          <div className="hidden font-display text-[30px] font-extrabold tracking-[-0.04em] lg:block">{t("workers.title")}</div>
          <div className="flex gap-1 rounded-full bg-glass p-1">
            {(["active", "archive"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={cn(
                  "h-9 rounded-full px-4 text-[13px] font-bold",
                  tab === k ? "bg-surface text-ink" : "text-muted",
                )}
              >
                {t(`workers.${k}`)} · {k === "active" ? active.length : archived.length}
              </button>
            ))}
          </div>
          <Link href="/workers/new" className="flex h-11 items-center gap-2 rounded-[22px] bg-coral px-4 text-[15px] font-bold text-white">
            <Icon name="plus" size={16} />
            <span className="hidden sm:inline">{t("nav.addWorker")}</span>
          </Link>
        </div>
      </header>

      <div className="-mt-11 flex flex-col gap-3.5 px-4 lg:mt-0 lg:grid lg:grid-cols-2 lg:px-0 xl:grid-cols-3">
        {list.length === 0 && (
          <Card padding="lg" className="text-sm text-muted">
            {tab === "active" ? t("workers.empty") : t("workers.archivedEmpty")}
          </Card>
        )}
        {list.map((w) => (
          <Link key={w.id} href={`/workers/${w.id}`}>
            <Card padding="md" className="flex items-center gap-3">
              <Avatar initial={w.name[0]} tone={w.tone} size={50} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-extrabold">{w.name}</div>
                <div className="text-[13px] font-medium text-muted">
                  {roleName(t, w.role, w.roleLabel)} ·{" "}
                  {w.endDate
                    ? t("workers.period", { from: formatMonth(w.startDate.slice(0, 7), lang), to: formatMonth(w.endDate.slice(0, 7), lang) })
                    : t("workers.since", { date: formatDayMonth(w.startDate, lang) })}
                </div>
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-present-bg px-2 py-0.5 text-[11px] font-bold text-present-fg">
                  <Icon name="check" size={10} strokeWidth={4} />
                  {t("workers.attendance", { percent: attendancePercent(state, w) })}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg font-bold tabular">{formatINR(w.salary)}</div>
                <div className="text-[11px] text-muted">{t("common.perMonth")}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
