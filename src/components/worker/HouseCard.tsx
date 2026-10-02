"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatTimeShort } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import type { DayInfo } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { roleName } from "@/lib/roles";
import type { Engagement } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StateIcon } from "@/components/ui/StateIcon";
import { DisputeSheet } from "./DisputeSheet";
import { useWorkerLink } from "./WorkerStore";

interface Props {
  engagement: Engagement;
  info: DayInfo;
  onCame: () => void;
  onLeave: () => void;
  onDispute: (reason: string, voiceSeconds?: number) => void;
}

/** One house on the worker's "today" screen: big actions, or the recorded state. */
export function HouseCard({ engagement: e, info, onCame, onLeave, onDispute }: Props) {
  const { t, lang } = useI18n();
  const { me } = useWorkerLink();
  const g = { gender: me.gender };
  const [disputeOpen, setDisputeOpen] = useState(false);
  const hi = lang === "hi";
  const canDispute = (info.state === "leave" || info.state === "present") && info.entry?.markedBy === "household";

  return (
    <Card padding="lg" radius={28}>
      <div className="flex items-center gap-3">
        <Avatar initial={e.initial} tone={e.tone} size={48} />
        <div className="min-w-0 flex-1">
          <div className="text-[21px] font-extrabold leading-[1.2]">{e.houseName}</div>
          <div className="flex justify-between text-[17px] font-semibold text-muted">
            <span>{roleName(t, e.role, e.roleLabel)}</span>
            <span className="font-sans font-extrabold text-ink">
              {formatINR(e.salary)}
              <span className={cn("text-sm font-medium text-muted", hi && "font-deva")}> {t("worker.perMonth")}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex flex-col gap-2.5">
        {info.state === "unknown" && (
          <>
            <button
              type="button"
              onClick={onCame}
              className="flex h-[72px] items-center justify-center gap-3 rounded-[22px] bg-coral text-[26px] font-extrabold text-white"
            >
              <Icon name="check" size={30} strokeWidth={3} />
              {t("worker.came", g)}
            </button>
            <button
              type="button"
              onClick={onLeave}
              className="flex h-16 items-center justify-center gap-2.5 rounded-[22px] border-[2.5px] border-ink bg-surface text-[21px] font-extrabold"
            >
              <Icon name="x" size={20} strokeWidth={3} />
              {t("worker.leaveToday")}
            </button>
          </>
        )}

        {info.state === "claim" && (
          <div className="flex items-center gap-3 rounded-[20px] bg-claim-bg px-3.5 py-3">
            <StateIcon state="claim" size={44} />
            <div className="leading-[1.25]">
              <div className="text-[21px] font-extrabold">{t("worker.claimSent")}</div>
            </div>
          </div>
        )}

        {info.state === "present" && (
          <div className="flex items-center gap-3 rounded-[20px] bg-present-bg px-3.5 py-3">
            <StateIcon state="present" size={44} />
            <div className="leading-[1.25]">
              <div className="text-[21px] font-extrabold">{t("worker.cameRecorded", g)}</div>
              {info.entry?.markedBy === "household" && (
                <div className="text-base font-semibold text-muted">
                  {t("worker.markedBy", { time: formatTimeShort(info.entry.at) })}
                </div>
              )}
            </div>
          </div>
        )}

        {info.state === "leave" && (
          <div className="flex items-center gap-3 rounded-[20px] bg-leave-bg px-3.5 py-3">
            <StateIcon state="leave" size={44} />
            <div className="leading-[1.25]">
              <div className="text-[21px] font-extrabold">{t("worker.leaveRecorded")}</div>
              {info.entry?.markedBy === "household" && (
                <div className="text-base font-semibold text-muted">
                  {t("worker.markedBy", { time: formatTimeShort(info.entry.at) })}
                </div>
              )}
            </div>
          </div>
        )}

        {info.state === "dispute" && (
          <div className="flex items-center gap-3 rounded-[20px] bg-dispute-bg px-3.5 py-3 text-dispute-fg">
            <StateIcon state="dispute" size={44} />
            <div className="text-[21px] font-extrabold leading-[1.25]">{t("worker.disputeSent")}</div>
          </div>
        )}

        {info.state === "off" && (
          <div className="flex items-center gap-3 rounded-[20px] bg-surface-2 px-3.5 py-3 text-muted">
            <StateIcon state="off" size={44} />
            <div className="text-[21px] font-extrabold">{t("state.off")}</div>
          </div>
        )}

        {canDispute && (
          <button
            type="button"
            onClick={() => setDisputeOpen(true)}
            className="flex h-[58px] items-center justify-center gap-2.5 rounded-[20px] bg-dispute-bg text-xl font-extrabold text-dispute-fg"
          >
            <Icon name="warning" size={22} />
            {t("worker.wrong")}
          </button>
        )}
      </div>

      <DisputeSheet
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        onSend={(reason, secs) => {
          onDispute(reason, secs);
          setDisputeOpen(false);
        }}
      />
    </Card>
  );
}
