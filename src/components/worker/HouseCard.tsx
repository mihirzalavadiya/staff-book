"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatTimeShort } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import type { DayInfo } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { roleName } from "@/lib/roles";
import type { Engagement } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { StateIcon } from "@/components/ui/StateIcon";
import { DisputeSheet } from "./DisputeSheet";
import { Spinner } from "@/components/ui/Spinner";
import type { Phase } from "@/lib/phase";
import { useWorkerLink } from "./WorkerStore";

interface ActProps {
  phase: Phase;
  loadingText: string;
  disabled: boolean;
  onClick: () => void;
}

interface Props {
  engagement: Engagement;
  info: DayInfo;
  came: ActProps;
  leave: ActProps;
  onDispute: (reason: string, voiceSeconds: number | undefined, onPhase: (p: Phase) => void) => Promise<boolean>;
  className?: string;
}

/** One house on the worker's "today" screen: big actions, or the recorded state. */
export function HouseCard({ engagement: e, info, came, leave, onDispute, className }: Props) {
  const { t, lang } = useI18n();
  const { me } = useWorkerLink();
  const g = { gender: me.gender };
  const [disputeOpen, setDisputeOpen] = useState(false);
  const hi = lang === "hi";
  const canDispute = (info.state === "leave" || info.state === "present") && info.entry?.markedBy === "household";

  const recorded = (tone: "present" | "leave" | "claim" | "dispute" | "off", title: string, sub?: string) => (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-[6px] px-4 py-3.5",
        tone === "present" ? "bg-present-bg" : tone === "dispute" ? "bg-dispute-bg text-dispute-fg" : tone === "claim" ? "bg-claim-bg" : "bg-surface-2",
      )}
    >
      <StateIcon state={tone} size={44} />
      <div className="leading-[1.25]">
        <div className="text-base font-bold">{title}</div>
        {sub && <div className="text-[15px] text-muted">{sub}</div>}
      </div>
    </div>
  );
  const markedBy = info.entry?.markedBy === "household" ? t("worker.markedBy", { time: formatTimeShort(info.entry.at) }) : undefined;

  return (
    <div className={cn("py-[18px]", className)}>
      <div className="font-display text-[22px] leading-[1.25]">{e.houseName}</div>
      <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[15px] text-muted">
        <span>{roleName(t, e.role, e.roleLabel)}</span>
        <span className="font-display text-[19px] whitespace-nowrap text-ink">
          {formatINR(e.salary)}
          <span className={cn("font-sans text-[13px] text-muted", hi && "font-deva")}> {t("worker.perMonth")}</span>
        </span>
      </div>

      <div className="mt-3.5 flex flex-col gap-2.5">
        {info.state === "unknown" && (
          <>
            <button
              type="button"
              onClick={came.onClick}
              aria-busy={came.phase !== "idle" || undefined}
              disabled={came.disabled || came.phase !== "idle"}
              className={cn("flex h-[72px] items-center justify-center gap-3 rounded-[6px] bg-ink text-[22px] font-bold text-bg", came.phase !== "idle" ? "cursor-progress" : "disabled:opacity-60")}
            >
              {came.phase !== "idle" ? (
                <>
                  <Spinner size={26} />
                  {came.loadingText}
                </>
              ) : (
                <>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-present-icon text-present-fg">
                    <Icon name="check" size={20} strokeWidth={3} />
                  </span>
                  {t("worker.came", g)}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={leave.onClick}
              aria-busy={leave.phase !== "idle" || undefined}
              disabled={leave.disabled || leave.phase !== "idle"}
              className={cn("flex h-16 items-center justify-center gap-3 rounded-[6px] border-2 border-ink text-lg font-bold", leave.phase !== "idle" ? "cursor-progress" : "disabled:opacity-60")}
            >
              {leave.phase !== "idle" ? (
                <>
                  <Spinner size={20} />
                  {leave.loadingText}
                </>
              ) : (
                <>
                  <Icon name="x" size={16} strokeWidth={3} />
                  {t("worker.leaveToday")}
                </>
              )}
            </button>
          </>
        )}

        {info.state === "claim" && recorded("claim", t("worker.claimSent"))}
        {info.state === "present" && recorded("present", t("worker.cameRecorded", g), markedBy)}
        {info.state === "leave" && recorded("leave", t("worker.leaveRecorded"), markedBy)}
        {info.state === "dispute" && recorded("dispute", t("worker.disputeSent"))}
        {info.state === "off" && recorded("off", t("state.off"))}

        {canDispute && (
          <button
            type="button"
            onClick={() => setDisputeOpen(true)}
            className="flex h-[58px] items-center justify-center gap-2.5 rounded-[6px] border-2 border-dispute-fg text-base font-bold text-dispute-fg"
          >
            <Icon name="warning" size={20} />
            {t("worker.wrong")}
          </button>
        )}
      </div>

      <DisputeSheet
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        onSend={async (reason, secs, onPhase) => {
          if (await onDispute(reason, secs, onPhase)) setDisputeOpen(false);
        }}
      />
    </div>
  );
}
