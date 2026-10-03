"use client";

import Link from "next/link";
import { dayLong, formatDayMonth, weekdayOf } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { dayInfo } from "@/lib/ledger";
import { useAct, useStore } from "@/lib/store";
import { HouseCard } from "@/components/worker/HouseCard";
import { WorkerHeader } from "@/components/worker/WorkerShell";
import { useWorkerLink } from "@/components/worker/WorkerStore";
import { WorkerTopRow } from "@/components/worker/WorkerTopRow";
import { Icon } from "@/components/ui/Icon";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { PushPrompt } from "@/components/pwa/PushPrompt";
import { InviteCard } from "@/components/worker/InviteCard";

export default function WorkerTodayPage() {
  const { t, lang } = useI18n();
  const { state, dispatch } = useStore();
  const act = useAct();
  const { token, me, houses, invites } = useWorkerLink();
  const today = state.today;

  return (
    <div className="pb-[130px]">
      <WorkerHeader>
        <WorkerTopRow greeting={t("worker.greeting", { name: me.name })} token={token} />
        <h1 className="mt-5 font-display text-[36px] leading-[1.15]">
          {dayLong(lang)[weekdayOf(today)]},
          <br />
          {formatDayMonth(today, lang)}
        </h1>
      </WorkerHeader>

      <div className="relative mx-3.5 -mt-[50px] flex flex-col rounded-t-[22px] bg-bg px-[18px] pt-1">
        {invites.map((invite) => (
          <InviteCard key={invite.id} invite={invite} />
        ))}
        {houses.map((house, i) => {
          const engagement = state.workers.find((w) => w.id === house.id);
          if (!engagement) return null;
          return (
            <HouseCard
              key={house.id}
              className={i > 0 ? "border-t border-line" : ""}
              engagement={house}
              info={dayInfo(state, engagement, today)}
              came={act({ type: "mark", workerId: house.id, date: today, state: "present", by: "worker" })}
              leave={act({ type: "mark", workerId: house.id, date: today, state: "leave", by: "worker" })}
              onDispute={(reason, secs, onPhase) => dispatch({ type: "raiseDispute", workerId: house.id, date: today, note: reason, voiceSeconds: secs }, onPhase)}
            />
          );
        })}

        <PushPrompt target={{ kind: "worker", token }} large className="mt-3.5" />
        <InstallBanner />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto grid w-full max-w-[480px] grid-cols-2 gap-2.5 border-t border-line bg-bg px-4 pt-3 pb-safe">
        <Link href={`/w/${token}/leave`} className="flex h-[66px] items-center justify-center gap-[9px] rounded-[6px] border-[1.5px] border-ink bg-surface-2 text-base font-bold">
          <Icon name="calendar" size={22} />
          {t("worker.planLeave")}
        </Link>
        <Link href={`/w/${token}/hisaab`} className="flex h-[66px] items-center justify-center gap-[9px] rounded-[6px] border-[1.5px] border-ink bg-surface-2 text-base font-bold">
          <Icon name="rupee" size={22} />
          {t("worker.myHisaab")}
        </Link>
      </div>
    </div>
  );
}
