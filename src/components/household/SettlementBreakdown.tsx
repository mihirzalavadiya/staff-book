"use client";

import { cn } from "@/lib/cn";
import { formatDayMonth } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import type { MonthSummary } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

function Row({
  label,
  sub,
  value,
  divider,
  className,
}: {
  label: string;
  sub?: string;
  value: string;
  divider?: "thin" | "thick";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 py-3",
        divider === "thin" && "border-t border-line",
        divider === "thick" && "border-t-[6px] border-surface-2",
        className,
      )}
    >
      <div>
        <div className="font-semibold">{label}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-2">{sub}</div>}
      </div>
      <span className="whitespace-nowrap font-display text-[17px] font-bold tabular">{value}</span>
    </div>
  );
}

interface Props {
  summary: MonthSummary;
  workerName: string;
  gender?: "female" | "male";
  /** "household" shows the eye footer; "worker" shows the big amount line. */
  side?: "household" | "worker";
  className?: string;
}

/** The ticket-style month breakdown. Both sides render the exact same numbers. */
export function SettlementBreakdown({ summary, workerName, gender, side = "household", className }: Props) {
  const { t, lang } = useI18n();
  const s = summary;
  const advanceDates = s.advances.map((a) => formatDayMonth(a.date, lang)).join(" · ");

  return (
    <Card padding="none" radius={28} className={cn("px-[18px] pt-1.5 pb-2.5", className)}>
      <Row label={t("hisaab.workingDays")} value={String(s.workingDays)} />
      <Row label={t("hisaab.present", { gender: gender ?? "female" })} value={String(s.present)} divider="thin" />
      <Row
        label={t("hisaab.leave")}
        sub={t("hisaab.leaveDetail", { free: s.paidLeaveUsed, unpaid: s.unpaidLeave })}
        value={String(s.leave)}
        divider="thin"
      />
      <Row label={t("hisaab.salary")} value={formatINR(s.amountDue + s.deduction + s.advanceTotal)} divider="thick" />
      <Row
        label={t("hisaab.unpaidLeave")}
        sub={t("hisaab.unpaidDetail", { days: s.unpaidLeave, rate: formatINR(Math.round(s.perDay)) })}
        value={s.deduction > 0 ? formatINR(-s.deduction) : formatINR(0)}
        divider="thin"
      />
      <Row
        label={t("hisaab.advance")}
        sub={advanceDates || undefined}
        value={s.advanceTotal > 0 ? formatINR(-s.advanceTotal) : formatINR(0)}
        divider="thin"
      />
      {side === "worker" ? (
        <div className="flex items-end justify-between border-t-2 border-dashed border-line-dashed pt-3 pb-1">
          <div className="text-[13px] font-bold text-muted">{t("hisaab.due")}</div>
          <div className="font-display text-[44px] font-extrabold leading-none tracking-[-0.04em] tabular">
            {formatINR(s.amountDue)}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 border-t-2 border-dashed border-line-dashed pt-2.5 pb-1 text-xs text-muted">
          <Icon name="eye" size={14} />
          {t("hisaab.sameForWorker", { name: workerName })}
        </div>
      )}
    </Card>
  );
}
