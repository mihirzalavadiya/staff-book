"use client";

import { cn } from "@/lib/cn";
import { formatDayMonth } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import type { MonthSummary } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";

function Row({ label, sub, value, first }: { label: string; sub?: string; value: string; first?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-3.5", !first && "border-t border-line")}>
      <div>
        <div className="text-[15px]">{label}</div>
        {sub && <div className="mt-[3px] text-xs text-muted-2">{sub}</div>}
      </div>
      <span className="font-display text-[22px] whitespace-nowrap tabular">{value}</span>
    </div>
  );
}

interface Props {
  summary: MonthSummary;
  workerName: string;
  gender?: "female" | "male";
  /** "household" adds the "they see the same numbers" note. */
  side?: "household" | "worker";
  className?: string;
}

/** The month as a ledger: attendance, money, then the amount due. Both sides render the exact same numbers. */
export function SettlementBreakdown({ summary: s, workerName, gender, side = "household", className }: Props) {
  const { t, lang } = useI18n();
  const advanceDates = s.advances.map((a) => formatDayMonth(a.date, lang)).join(" · ");

  return (
    <section className={className}>
      <div className="label-caps">{t("hisaab.attendance")}</div>
      <div className="mt-2">
        <Row first label={t("hisaab.workingDays")} value={String(s.workingDays)} />
        <Row label={t("hisaab.present", { gender: gender ?? "female" })} value={String(s.present)} />
        <Row
          label={t("hisaab.leave")}
          sub={t("hisaab.leaveDetail", { free: s.paidLeaveUsed, unpaid: s.unpaidLeave })}
          value={String(s.leave)}
        />
      </div>
      <div className="label-caps mt-[22px]">{t("hisaab.money")}</div>
      <div className="mt-2">
        <Row first label={t("hisaab.salary")} value={formatINR(s.amountDue + s.deduction + s.advanceTotal)} />
        <Row
          label={t("hisaab.unpaidLeave")}
          sub={t("hisaab.unpaidDetail", { days: s.unpaidLeave, rate: formatINR(Math.round(s.perDay)) })}
          value={s.deduction > 0 ? `−${formatINR(s.deduction)}` : formatINR(0)}
        />
        <Row
          label={t("hisaab.advance")}
          sub={advanceDates || undefined}
          value={s.advanceTotal > 0 ? `−${formatINR(s.advanceTotal)}` : formatINR(0)}
        />
      </div>
      <div className="flex items-baseline justify-between border-t-[1.5px] border-ink pt-4 pb-1.5">
        <span className="text-[11px] font-bold tracking-[0.2em] uppercase">{t("hisaab.due")}</span>
        <span className="font-display text-[32px] tabular">{formatINR(s.amountDue)}</span>
      </div>
      {side === "household" && (
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Icon name="eye" size={14} />
          {t("hisaab.sameForWorker", { name: workerName })}
        </div>
      )}
    </section>
  );
}
