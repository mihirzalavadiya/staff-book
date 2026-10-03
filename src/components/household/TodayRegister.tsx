"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { addDays, formatTime } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { dayInfo, todayProgress, type DayInfo } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { roleName } from "@/lib/roles";
import { useAct, useStore } from "@/lib/store";
import type { DayState, Worker } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { StateChip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";

const COLS = "grid grid-cols-[minmax(0,1.3fr)_110px_minmax(0,1fr)_170px_86px] gap-4";

const DOT: Record<DayState, string> = {
  present: "bg-present-dot",
  leave: "bg-off-fg",
  claim: "bg-claim-dot",
  dispute: "bg-dispute-dot",
  unknown: "border border-dashed border-line-dashed",
  off: "border border-line",
};

/** Seven small dots, oldest first, ending today. */
function LastSeven({ worker }: { worker: Worker }) {
  const { state } = useStore();
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: 7 }, (_, i) => addDays(state.today, i - 6)).map((date) => (
        <span key={date} className={cn("h-2.5 w-2.5 rounded-full", DOT[dayInfo(state, worker, date).state])} />
      ))}
    </div>
  );
}

function statusLabel(t: ReturnType<typeof useI18n>["t"], worker: Worker, info: DayInfo): string {
  const g = { gender: worker.gender };
  const at = info.entry ? ` · ${formatTime(info.entry.at)}` : "";
  switch (info.state) {
    case "present":
      return t("state.present", g) + at;
    case "leave":
      return t("state.leave");
    case "claim":
      return t("home.claimShort") + at;
    case "dispute":
      return t("state.dispute", g);
    case "off":
      return t("state.off");
    default:
      return t("state.unknown");
  }
}

function RowActions({ worker, info }: { worker: Worker; info: DayInfo }) {
  const { t } = useI18n();
  const { state } = useStore();
  const act = useAct();
  const date = state.today;
  const g = { gender: worker.gender };
  const pair = (yes: Parameters<typeof act>[0], no: Parameters<typeof act>[0], yesLabel: string, noLabel: string) => (
    <div className="flex justify-end gap-1.5">
      <Button size="sm" {...act(yes)}>
        <Icon name="check" size={12} />
        {yesLabel}
      </Button>
      <Button size="sm" variant="outline" {...act(no)}>
        <Icon name="x" size={10} />
        {noLabel}
      </Button>
    </div>
  );
  if (info.state === "unknown") {
    return pair(
      { type: "mark", workerId: worker.id, date, state: "present", by: "household" },
      { type: "mark", workerId: worker.id, date, state: "leave", by: "household" },
      t("home.markPresent", g),
      t("home.markLeave"),
    );
  }
  if (info.state === "claim") {
    return pair(
      { type: "confirmClaim", workerId: worker.id, date },
      { type: "rejectClaim", workerId: worker.id, date },
      t("common.yes"),
      t("common.no"),
    );
  }
  if (info.state === "dispute") {
    return pair(
      { type: "resolveDispute", workerId: worker.id, date, resolution: "present" },
      { type: "resolveDispute", workerId: worker.id, date, resolution: "leave" },
      t("common.yes"),
      t("calendar.keepLeave"),
    );
  }
  if (info.entry) {
    return (
      <div className="label-caps text-right text-[9.5px]">
        {info.entry.markedBy === "household" ? t("common.youMarked") : t("common.selfMarked")}
      </div>
    );
  }
  return null;
}

/** Desktop home: today's attendance as a ledger table, one row per worker. */
export function TodayRegister() {
  const { t } = useI18n();
  const { state } = useStore();
  const workers = state.workers.filter((w) => !w.endDate);
  const progress = todayProgress(state);

  return (
    <section className="min-w-0">
      <div className="flex items-baseline justify-between border-b border-ink pb-2.5">
        <h2 className="font-display text-[30px] leading-none tracking-[-0.02em]">{t("home.register")}</h2>
        <span className="label-caps">{t("home.registerCount", { count: workers.length, filled: progress.filled })}</span>
      </div>
      <div className={cn(COLS, "pt-3 pb-2")}>
        <span className="label-caps text-[9.5px]">{t("home.workerCol")}</span>
        <span className="label-caps text-[9.5px]">{t("home.last7")}</span>
        <span className="label-caps text-[9.5px]">{t("common.todayLabel")}</span>
      </div>
      {workers.map((w, i) => {
        const info = dayInfo(state, w, state.today);
        return (
          <div key={w.id} className={cn(COLS, "items-center py-4", i > 0 && "border-t border-line")} data-worker-card={w.id}>
            <Link href={`/workers/${w.id}`} className="flex min-w-0 items-center gap-3">
              <Avatar initial={w.name[0]} tone={w.tone} size={40} />
              <div className="min-w-0">
                <div className="truncate font-display text-[23px] leading-none">{w.name}</div>
                <div className="label-caps mt-1 truncate text-[9.5px]">{roleName(t, w.role, w.roleLabel)}</div>
              </div>
            </Link>
            <LastSeven worker={w} />
            <StateChip state={info.state} label={statusLabel(t, w, info)} className="min-w-0 truncate" />
            <RowActions worker={w} info={info} />
            <div className="text-right font-display text-xl tabular">{formatINR(w.salary)}</div>
          </div>
        );
      })}
    </section>
  );
}
