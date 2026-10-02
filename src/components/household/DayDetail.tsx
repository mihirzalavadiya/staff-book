"use client";

import { dayLong, formatDayMonth, formatTime, weekdayOf } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { canEdit, dayInfo } from "@/lib/ledger";
import { useAct, useStore } from "@/lib/store";
import type { Worker } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { StateChip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { StateIcon } from "@/components/ui/StateIcon";
import Link from "next/link";

interface Props {
  worker: Worker;
  date: string;
}

/** History of a single day plus the actions the household can take on it. */
export function DayDetail({ worker, date }: Props) {
  const { t, lang } = useI18n();
  const { state } = useStore();
  const act = useAct();
  const info = dayInfo(state, worker, date);
  const editable = canEdit(state, date);
  const future = date > state.today;
  const g = { gender: worker.gender };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold text-muted">{dayLong(lang)[weekdayOf(date)]}</div>
          <div className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.03em]">
            {formatDayMonth(date, lang)}
          </div>
        </div>
        <StateChip state={info.state} label={t(`state.${info.state}`, g)} />
      </div>

      {info.history.length > 0 && (
        <div className="rounded-[20px] bg-surface-2 px-3.5 py-1">
          {info.history.map((h, i) => (
            <div key={h.id} className={`flex items-center gap-3 py-2.5 ${i > 0 ? "border-t border-line" : ""}`}>
              <StateIcon state={h.state} size={30} />
              <div className="min-w-0 flex-1 text-sm leading-tight">
                <div className="font-bold">
                  {t("calendar.whoMarked", {
                    who: h.markedBy === "household" ? t("calendar.you") : t("calendar.worker", { name: worker.name }),
                    state: t(`state.${h.state}`, g),
                    time: formatTime(h.at),
                  })}
                </div>
                {h.voiceSeconds ? (
                  <button type="button" className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-coral">
                    <Icon name="play" size={12} />
                    {t("calendar.voiceNote", { seconds: h.voiceSeconds })}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {info.state === "claim" && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" {...act({ type: "confirmClaim", workerId: worker.id, date })}>
            <Icon name="check" size={14} />
            {t("common.yes")}
          </Button>
          <Button size="lg" variant="outline" {...act({ type: "rejectClaim", workerId: worker.id, date })}>
            <Icon name="x" size={12} />
            {t("common.no")}
          </Button>
        </div>
      )}

      {info.state === "dispute" && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" {...act({ type: "resolveDispute", workerId: worker.id, date, resolution: "present" })}>
            <Icon name="check" size={14} />
            {t("calendar.confirmPresent", g)}
          </Button>
          <Button size="lg" variant="outline" {...act({ type: "resolveDispute", workerId: worker.id, date, resolution: "leave" })}>
            <Icon name="x" size={12} />
            {t("calendar.keepLeave")}
          </Button>
        </div>
      )}

      {(info.state === "unknown" || info.state === "present" || info.state === "leave" || info.state === "off") && !future && (
        editable ? (
          <div>
            <div className="mb-2 text-[13px] font-bold text-muted">{t("calendar.changeTo")}</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                {...act({ type: "mark", workerId: worker.id, date, state: "present", by: "household" }, { disabled: info.state === "present" })}
              >
                <Icon name="check" size={16} strokeWidth={3.2} />
                {t("home.markPresent", g)}
              </Button>
              <Button
                size="lg"
                variant="soft"
                {...act({ type: "mark", workerId: worker.id, date, state: "leave", by: "household" }, { disabled: info.state === "leave" })}
              >
                <Icon name="x" size={13} />
                {t("home.markLeave")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-[18px] bg-surface-2 px-3.5 py-3 text-[13px] font-semibold text-muted">
            <Icon name="clock" size={16} />
            <span className="flex-1">{t("calendar.editWindow")}</span>
            <Link href={`/hisaab?worker=${worker.id}&month=${date.slice(0, 7)}`} className="font-extrabold text-coral">
              {t("nav.hisaab")} →
            </Link>
          </div>
        )
      )}

      {future && info.state === "off" && (
        <div className="rounded-[18px] bg-surface-2 px-3.5 py-3 text-[13px] font-semibold text-muted">—</div>
      )}
    </div>
  );
}
