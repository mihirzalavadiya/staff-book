"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { dayShort, addMonths, dayOfMonth, formatMonthLong, monthDates, monthOf, weekdayOf } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { dayInfo } from "@/lib/ledger";
import { useStore } from "@/lib/store";
import { WorkerHeader } from "@/components/worker/WorkerShell";
import { WorkerTopRow } from "@/components/worker/WorkerTopRow";
import { useWorkerLink } from "@/components/worker/WorkerStore";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { withPhases, type Phase } from "@/lib/phase";

const REASONS = ["sick", "village", "festival", "other"] as const;

function MonthPickGrid({
  month,
  today,
  selected,
  taken,
  onToggle,
}: {
  month: string;
  today: string;
  selected: Set<string>;
  taken: Set<string>;
  onToggle: (d: string) => void;
}) {
  const dates = monthDates(month);
  const lead = weekdayOf(dates[0]);
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {Array.from({ length: lead }).map((_, i) => (
        <div key={`l${i}`} />
      ))}
      {dates.map((d) => {
        const past = d < today;
        const isToday = d === today;
        const on = selected.has(d);
        const already = taken.has(d);
        return (
          <button
            key={d}
            type="button"
            disabled={past || already}
            onClick={() => onToggle(d)}
            aria-pressed={on}
            className={cn(
              "flex h-12 items-center justify-center rounded-2xl text-lg font-bold",
              on ? "bg-coral text-white" : already ? "bg-leave-cell text-leave-fg" : past ? "text-off-fg" : "bg-surface-2",
              isToday && !on && "ring-2 ring-coral",
            )}
          >
            {dayOfMonth(d)}
          </button>
        );
      })}
    </div>
  );
}

export default function PlanLeavePage() {
  const { t, lang } = useI18n();
  const { state, dispatch } = useStore();
  const router = useRouter();
  const { token, houses: engagements } = useWorkerLink();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [houses, setHouses] = useState<Set<string>>(new Set(engagements.map((e) => e.id)));
  const [done, setDone] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const saving = phase !== "idle";

  const month = monthOf(state.today);
  const next = addMonths(month, 1);
  // Days already on leave in every selected house are shown as taken.
  const taken = new Set(
    monthDates(month)
      .concat(monthDates(next))
      .filter((d) => d > state.today && state.workers.filter((w) => houses.has(w.id)).every((w) => dayInfo(state, w, d).state === "leave")),
  );

  const toggle = (d: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(d)) n.delete(d);
      else n.add(d);
      return n;
    });
  const toggleHouse = (id: string) =>
    setHouses((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const submit = async () => {
    if (selected.size === 0 || !reason || saving) return;
    const ok = await withPhases(async () => {
      const jobs = [...houses].flatMap((id) =>
        [...selected].map((d) => dispatch({ type: "mark", workerId: id, date: d, state: "leave", by: "worker", note: reason })),
      );
      return (await Promise.all(jobs)).every(Boolean);
    }, setPhase);
    if (!ok) return;
    setDone(true);
    setTimeout(() => router.push(`/w/${token}`), 1400);
  };

  const reasonLabel = (r: (typeof REASONS)[number]) =>
    r === "sick" ? t("worker.reasonSick") : r === "village" ? t("worker.reasonVillage") : r === "festival" ? t("worker.reasonFestival") : t("worker.reasonOther");

  return (
    <div className="pb-[120px]">
      <WorkerHeader>
        <WorkerTopRow token={token} back />
        <div className="mt-3.5 text-[19px] font-semibold text-muted">{t("worker.planLeave")}</div>
        <div className="text-[36px] font-extrabold leading-[1.1]">{t("worker.leaveTitle")}</div>
      </WorkerHeader>

      <div className="-mt-[46px] flex flex-col gap-3.5 px-4">
        {[month, next].map((m) => (
          <Card key={m} padding="lg" radius={28}>
            <div className="mb-3 text-[21px] font-extrabold">{formatMonthLong(m, lang)}</div>
            <div className="mb-1.5 grid grid-cols-7 gap-1.5">
              {dayShort(lang).map((d) => (
                <div key={d} className="text-center text-xs font-bold text-muted-2">
                  {d}
                </div>
              ))}
            </div>
            <MonthPickGrid month={m} today={state.today} selected={selected} taken={taken} onToggle={toggle} />
          </Card>
        ))}

        <Card padding="lg" radius={28}>
          <div className="mb-3 text-[21px] font-extrabold">{t("worker.leaveReason")}</div>
          <div className="grid grid-cols-2 gap-2.5">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                aria-pressed={reason === r}
                className={cn("h-16 rounded-[20px] text-xl font-extrabold", reason === r ? "bg-coral text-white" : "bg-surface-2")}
              >
                {reasonLabel(r)}
              </button>
            ))}
          </div>
        </Card>

        {engagements.length > 1 && (
          <Card padding="lg" radius={28}>
            <div className="mb-3 text-[21px] font-extrabold">{t("worker.houses", { count: houses.size })}</div>
            <div className="flex flex-col gap-2">
              {engagements.map((e) => {
                const on = houses.has(e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => toggleHouse(e.id)}
                    aria-pressed={on}
                    className={cn("flex h-16 items-center gap-3 rounded-[20px] px-3 text-lg font-extrabold", on ? "bg-coral-soft" : "bg-surface-2 text-muted")}
                  >
                    <Avatar initial={e.initial} tone={e.tone} size={40} />
                    <span className="flex-1 text-left">{e.houseName}</span>
                    {on && <Icon name="check" size={22} className="text-coral" />}
                  </button>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] rounded-t-[28px] bg-surface px-4 pt-3 pb-safe shadow-nav">
        {done ? (
          <div className="flex h-[66px] items-center justify-center gap-3 rounded-[22px] bg-present-bg text-xl font-extrabold text-present-fg">
            <Icon name="check" size={26} strokeWidth={3} />
            {t("worker.leaveDone")}
          </div>
        ) : (
          <button
            type="button"
            disabled={selected.size === 0 || !reason || saving}
            aria-busy={saving || undefined}
            onClick={submit}
            className={cn("flex h-[66px] w-full items-center justify-center gap-3 rounded-[22px] bg-coral text-[24px] font-extrabold text-white", saving ? "cursor-progress" : "disabled:opacity-40")}
          >
            {saving ? (
              <>
                <Spinner size={26} />
                {t("common.saving")}
              </>
            ) : (
              <>
                <Icon name="check" size={26} strokeWidth={3} />
                {`${t("common.done")}${selected.size > 0 ? ` · ${selected.size} ${t("common.days")}` : ""}`}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
