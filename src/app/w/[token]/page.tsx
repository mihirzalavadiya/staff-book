"use client";

import Link from "next/link";
import { dayLong, formatDayMonth, weekdayOf } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { dayInfo } from "@/lib/ledger";
import { useStore } from "@/lib/store";
import { HouseCard } from "@/components/worker/HouseCard";
import { WorkerHeader } from "@/components/worker/WorkerShell";
import { useWorkerLink } from "@/components/worker/WorkerStore";
import { WorkerTopRow } from "@/components/worker/WorkerTopRow";
import { Icon } from "@/components/ui/Icon";
import { InstallBanner } from "@/components/pwa/InstallBanner";

export default function WorkerTodayPage() {
  const { t, lang } = useI18n();
  const { state, dispatch } = useStore();
  const { token, me, houses } = useWorkerLink();
  const today = state.today;

  return (
    <div className="pb-[120px]">
      <WorkerHeader>
        <WorkerTopRow greeting={t("worker.greeting", { name: me.name })} token={token} />
        <div className="mt-3.5 text-[19px] font-semibold text-muted">
          {dayLong(lang)[weekdayOf(today)]}
        </div>
        <div className="text-[42px] font-extrabold leading-[1.05]">{formatDayMonth(today, lang)}</div>
      </WorkerHeader>

      <div className="-mt-[46px] flex flex-col gap-3.5 px-4">
        {houses.map((house) => {
          const engagement = state.workers.find((w) => w.id === house.id);
          if (!engagement) return null;
          return (
            <HouseCard
              key={house.id}
              engagement={house}
              info={dayInfo(state, engagement, today)}
              onCame={() => dispatch({ type: "mark", workerId: house.id, date: today, state: "present", by: "worker" })}
              onLeave={() => dispatch({ type: "mark", workerId: house.id, date: today, state: "leave", by: "worker" })}
              onDispute={(reason, secs) => dispatch({ type: "raiseDispute", workerId: house.id, date: today, note: reason, voiceSeconds: secs })}
            />
          );
        })}

        <InstallBanner />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto grid w-full max-w-[480px] grid-cols-2 gap-2.5 rounded-t-[28px] bg-surface px-4 pt-3 pb-safe shadow-nav">
        <Link href={`/w/${token}/leave`} className="flex h-[66px] items-center justify-center gap-2 rounded-[22px] bg-coral-soft text-lg font-extrabold">
          <Icon name="calendar" size={22} />
          {t("worker.planLeave")}
        </Link>
        <Link href={`/w/${token}/hisaab`} className="flex h-[66px] items-center justify-center gap-2 rounded-[22px] bg-coral-soft text-lg font-extrabold">
          <Icon name="rupee" size={22} />
          {t("worker.myHisaab")}
        </Link>
      </div>
    </div>
  );
}
