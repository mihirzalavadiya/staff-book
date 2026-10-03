"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { dayInfo, type DayInfo } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { roleName } from "@/lib/roles";
import { useAct, useStore } from "@/lib/store";
import type { Worker } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { StateChip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { StateIcon } from "@/components/ui/StateIcon";

function WorkerHeaderRow({ worker, href }: { worker: Worker; href?: string }) {
  const { t } = useI18n();
  const inner = (
    <>
      <Avatar initial={worker.name[0]} tone={worker.tone} size={44} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[26px] leading-none tracking-[-0.01em]">{worker.name}</div>
        <div className="label-caps mt-[5px] text-[10px]">{roleName(t, worker.role, worker.roleLabel)}</div>
      </div>
      <div className="text-right">
        <div className="font-display text-[21px] leading-tight tabular">{formatINR(worker.salary)}</div>
        <div className="label-caps mt-0.5 text-[9px]">{t("common.perMonth")}</div>
      </div>
    </>
  );
  const cls = "flex items-center gap-3.5";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/** A claim or dispute waiting on the household: the worker's words, then yes / no. */
function AskBox({ tone, quote, sub, children }: { tone: "claim" | "dispute"; quote: string; sub: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[3px] p-3.5", tone === "claim" ? "bg-surface-2" : "bg-dispute-bg")}>
      <div className="flex items-start gap-2.5">
        <StateIcon state={tone} size={24} />
        <div>
          <div className={cn("font-display text-[19px] leading-[1.25]", tone === "dispute" && "text-dispute-fg")}>{quote}</div>
          <div className="mt-0.5 text-xs text-muted">{sub}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

/** The state area under the worker header: status line + actions depending on the day's state. */
export function DayStateBlock({ worker, date, info }: { worker: Worker; date: string; info: DayInfo }) {
  const { t } = useI18n();
  const act = useAct();
  const g = { gender: worker.gender };

  if (info.state === "claim" && info.entry) {
    return (
      <AskBox
        tone="claim"
        quote={t("home.claimQuote", { time: formatTime(info.entry.at), ...g })}
        sub={t("home.claimBy", { name: worker.name })}
      >
        <Button size="md" className="h-[42px]" {...act({ type: "confirmClaim", workerId: worker.id, date })}>
          <Icon name="check" size={14} />
          {t("common.yes")}
        </Button>
        <Button size="md" variant="outline" className="h-[42px]" {...act({ type: "rejectClaim", workerId: worker.id, date })}>
          <Icon name="x" size={12} />
          {t("common.no")}
        </Button>
      </AskBox>
    );
  }

  if (info.state === "dispute" && info.entry) {
    const voice = info.entry.voiceSeconds ? `${t("common.voice")} 0:${String(info.entry.voiceSeconds).padStart(2, "0")}` : "";
    return (
      <AskBox tone="dispute" quote={t("home.disputeSummary", { name: worker.name, ...g })} sub={voice}>
        <Button size="md" className="h-[42px]" {...act({ type: "resolveDispute", workerId: worker.id, date, resolution: "present" })}>
          <Icon name="check" size={14} />
          {t("calendar.confirmPresent", g)}
        </Button>
        <Button size="md" variant="outline" className="h-[42px]" {...act({ type: "resolveDispute", workerId: worker.id, date, resolution: "leave" })}>
          <Icon name="x" size={12} />
          {t("calendar.keepLeave")}
        </Button>
      </AskBox>
    );
  }

  if (info.state === "present" || info.state === "leave") {
    const entry = info.entry!;
    const label =
      info.state === "present"
        ? entry.markedBy === "household"
          ? t("home.cameAt", { time: formatTime(entry.at), ...g })
          : t("state.present", g)
        : t("state.leave");
    const who = entry.markedBy === "household" ? t("common.youMarked") : t("common.selfMarked");
    return (
      <div className="flex items-center justify-between gap-2">
        <StateChip state={info.state} label={label} />
        <span className="label-caps truncate text-[10px] tracking-[0.14em]">{who}</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2.5">
        <StateChip state="unknown" label={t("state.unknown")} />
        <span className="truncate font-display text-[17px] text-muted italic">{t("home.cameShort", g)}</span>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <Button size="md" {...act({ type: "mark", workerId: worker.id, date, state: "present", by: "household" })}>
          <Icon name="check" size={15} strokeWidth={3} />
          {t("home.markPresent", g)}
        </Button>
        <Button size="md" variant="outline" {...act({ type: "mark", workerId: worker.id, date, state: "leave", by: "household" })}>
          <Icon name="x" size={12} />
          {t("home.markLeave")}
        </Button>
      </div>
    </>
  );
}

/** One worker in the phone list: header row, then today's status and actions. Rows are split by hairlines. */
export function WorkerCard({ worker, className }: { worker: Worker; className?: string }) {
  const { t } = useI18n();
  const { state } = useStore();
  const info = dayInfo(state, worker, state.today);
  return (
    <div className={cn("py-5", className)} data-worker-card={worker.id}>
      <WorkerHeaderRow worker={worker} href={`/workers/${worker.id}`} />
      <div className="mt-3.5">
        {info.state === "off" ? (
          <StateChip state="off" label={t("state.off")} />
        ) : (
          <DayStateBlock worker={worker} date={state.today} info={info} />
        )}
      </div>
    </div>
  );
}
