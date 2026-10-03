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
import { Card } from "@/components/ui/Card";
import { StateChip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { StateIcon } from "@/components/ui/StateIcon";

function WorkerHeaderRow({ worker, href }: { worker: Worker; href?: string }) {
  const { t } = useI18n();
  const inner = (
    <>
      <Avatar initial={worker.name[0]} tone={worker.tone} size={50} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px] font-extrabold">{worker.name}</div>
        <div className="text-[13px] font-medium text-muted">{roleName(t, worker.role, worker.roleLabel)}</div>
      </div>
      <div className="text-right">
        <div className="font-display text-lg font-bold tabular">{formatINR(worker.salary)}</div>
        <div className="text-[11px] text-muted">{t("common.perMonth")}</div>
      </div>
    </>
  );
  const cls = "flex items-center gap-3";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/** The state area under the worker header: chip + actions depending on today's state. */
export function DayStateBlock({ worker, date, info }: { worker: Worker; date: string; info: DayInfo }) {
  const { t } = useI18n();
    const act = useAct();

  if (info.state === "claim" && info.entry) {
    return (
      <div className="rounded-[18px] bg-claim-bg p-3">
        <div className="flex items-start gap-2.5">
          <StateIcon state="claim" size={30} />
          <div className="text-sm leading-[1.4]">
            <b>{t("home.claimText", { name: worker.name, gender: worker.gender, time: formatTime(info.entry.at) })}</b>{" "}
            {t("home.claimQuestion")}
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Button size="md" {...act({ type: "confirmClaim", workerId: worker.id, date })}>
            <Icon name="check" size={14} />
            {t("common.yes")}
          </Button>
          <Button size="md" variant="outline" {...act({ type: "rejectClaim", workerId: worker.id, date })}>
            <Icon name="x" size={12} />
            {t("common.no")}
          </Button>
        </div>
      </div>
    );
  }

  if (info.state === "dispute" && info.entry) {
    return (
      <div className="rounded-[18px] bg-dispute-bg p-3">
        <div className="flex items-start gap-2.5">
          <StateIcon state="dispute" size={30} />
          <div className="text-sm leading-[1.4] text-dispute-fg">
            <b>{t("home.disputeSummary", { name: worker.name, gender: worker.gender })}</b>
            {info.entry.voiceSeconds ? ` · ${t("common.voice")} 0:${String(info.entry.voiceSeconds).padStart(2, "0")}` : ""}
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Button size="md" {...act({ type: "resolveDispute", workerId: worker.id, date, resolution: "present" })}>
            <Icon name="check" size={14} />
            {t("calendar.confirmPresent", { gender: worker.gender })}
          </Button>
          <Button size="md" variant="outline" {...act({ type: "resolveDispute", workerId: worker.id, date, resolution: "leave" })}>
            <Icon name="x" size={12} />
            {t("calendar.keepLeave")}
          </Button>
        </div>
      </div>
    );
  }

  if (info.state === "present" || info.state === "leave") {
    const entry = info.entry!;
    const label =
      info.state === "present"
        ? entry.markedBy === "household"
          ? t("home.cameAt", { time: formatTime(entry.at), gender: worker.gender })
          : t("state.present", { gender: worker.gender })
        : t("state.leave");
    const who = entry.markedBy === "household" ? t("common.youMarked") : t("common.selfMarked");
    return (
      <div className="flex items-center justify-between gap-2">
        <StateChip state={info.state} label={label} />
        <span className="text-xs font-semibold text-muted">{who}</span>
      </div>
    );
  }

  // unknown
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <StateChip state="unknown" label={t("state.unknown")} />
        <span className="truncate text-[13px] font-semibold text-muted">{t("home.cameToday", { name: worker.name, gender: worker.gender })}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="lg" {...act({ type: "mark", workerId: worker.id, date, state: "present", by: "household" })}>
          <Icon name="check" size={16} strokeWidth={3.2} />
          {t("home.markPresent", { gender: worker.gender })}
        </Button>
        <Button size="lg" variant="soft" {...act({ type: "mark", workerId: worker.id, date, state: "leave", by: "household" })}>
          <Icon name="x" size={13} />
          {t("home.markLeave")}
        </Button>
      </div>
    </>
  );
}

export function WorkerCard({ worker, className }: { worker: Worker; className?: string }) {
  const { t } = useI18n();
  const { state } = useStore();
  const info = dayInfo(state, worker, state.today);
  return (
    <Card padding="md" className={cn("flex flex-col", className)} data-worker-card={worker.id}>
      <WorkerHeaderRow worker={worker} href={`/workers/${worker.id}`} />
      <div className="mt-3.5">
        {info.state === "off" ? (
          <div className="flex items-center justify-between gap-2">
            <StateChip state="off" label={t("state.off")} />
          </div>
        ) : (
          <DayStateBlock worker={worker} date={state.today} info={info} />
        )}
      </div>
    </Card>
  );
}
