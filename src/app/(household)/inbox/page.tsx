"use client";

import { formatDayMonth, formatTime } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { pendingItems, type PendingItem } from "@/lib/ledger";
import { useStore } from "@/lib/store";
import { HEADER_CLASS, MobileTopRow } from "@/components/household/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StateIcon } from "@/components/ui/StateIcon";
import Link from "next/link";

function InboxRow({ item, first }: { item: PendingItem; first: boolean }) {
  const { t, lang } = useI18n();
  const { state, dispatch } = useStore();
  const { worker, date, info, reminder } = item;
  const dateLabel = date === state.today ? t("common.todayLabel") : formatDayMonth(date, lang);
  const inSentence = date === state.today ? dateLabel.toLowerCase() : dateLabel;
  const g = { gender: worker.gender };

  let line = "";
  if (info.state === "claim" && info.entry) line = t("inbox.claimLine", { name: worker.name, date: inSentence, time: formatTime(info.entry.at), ...g });
  else if (info.state === "dispute") line = t("inbox.disputeLine", { name: worker.name, date: inSentence, ...g });
  else if (reminder) line = t("inbox.remindedLine", { name: worker.name, time: formatTime(reminder.at), ...g });
  else line = t("inbox.unknownLine", { name: worker.name, date: inSentence });

  return (
    <div className={`py-3.5 ${first ? "" : "border-t border-line"}`}>
      <div className="flex items-start gap-3">
        <StateIcon state={info.state} size={34} />
        <div className="min-w-0 flex-1 leading-[1.35]">
          <div className="flex items-center gap-2">
            <span className="font-bold">{worker.name} · {dateLabel}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${reminder ? "bg-coral-soft text-coral" : "bg-surface-2 text-muted"}`}>
              {reminder ? t("inbox.reminded") : t(`inbox.${info.state}`)}
            </span>
          </div>
          <div className="text-sm text-muted">{line}</div>
          {info.entry?.voiceSeconds ? (
            <button type="button" className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-coral">
              <Icon name="play" size={12} />
              {t("inbox.playVoice")} · 0:{String(info.entry.voiceSeconds).padStart(2, "0")}
            </button>
          ) : null}
        </div>
        <Link href={`/calendar?worker=${worker.id}&date=${date}`} aria-label={t("common.view")} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted">
          <Icon name="chevronRight" size={16} />
        </Link>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2 pl-[46px]">
        {info.state === "claim" && (
          <>
            <Button size="md" onClick={() => dispatch({ type: "confirmClaim", workerId: worker.id, date })}>
              <Icon name="check" size={14} />
              {t("inbox.confirm")}
            </Button>
            <Button size="md" variant="outline" onClick={() => dispatch({ type: "rejectClaim", workerId: worker.id, date })}>
              <Icon name="x" size={12} />
              {t("inbox.reject")}
            </Button>
          </>
        )}
        {info.state === "dispute" && (
          <>
            <Button size="md" onClick={() => dispatch({ type: "resolveDispute", workerId: worker.id, date, resolution: "present" })}>
              <Icon name="check" size={14} />
              {t("calendar.confirmPresent", g)}
            </Button>
            <Button size="md" variant="outline" onClick={() => dispatch({ type: "resolveDispute", workerId: worker.id, date, resolution: "leave" })}>
              <Icon name="x" size={12} />
              {t("calendar.keepLeave")}
            </Button>
          </>
        )}
        {info.state === "unknown" && (
          <>
            <Button size="md" onClick={() => dispatch({ type: "mark", workerId: worker.id, date, state: "present", by: "household" })}>
              <Icon name="check" size={14} />
              {t("inbox.came", g)}
            </Button>
            <Button size="md" variant="soft" onClick={() => dispatch({ type: "mark", workerId: worker.id, date, state: "leave", by: "household" })}>
              <Icon name="x" size={12} />
              {t("inbox.leave")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function InboxPage() {
  const { t } = useI18n();
  const { state } = useStore();
  const items = pendingItems(state);

  return (
    <div className="lg:flex lg:min-h-dvh lg:flex-col lg:gap-4 lg:p-5">
      <header className={`${HEADER_CLASS} gap-3 pb-[70px]`}>
        <MobileTopRow title={t("inbox.title")} />
        <div>
          <div className="hidden font-display text-[30px] font-extrabold tracking-[-0.04em] lg:block">{t("inbox.title")}</div>
          <div className="text-[15px] font-semibold text-muted">{t("inbox.subtitle")}</div>
          <div className="mt-2 font-display text-[38px] font-extrabold leading-none tracking-[-0.04em] lg:hidden">
            {items.length} {t("common.pending").toLowerCase()}
          </div>
        </div>
      </header>
      <div className="-mt-11 px-4 lg:mt-0 lg:max-w-[720px] lg:px-0">
        <Card padding="none" className="px-[18px] py-1">
          {items.length === 0 ? (
            <div className="flex items-center gap-3 py-5">
              <StateIcon state="present" size={34} />
              <div className="font-bold">{t("inbox.empty")}</div>
            </div>
          ) : (
            items.map((item, i) => <InboxRow key={`${item.worker.id}-${item.date}`} item={item} first={i === 0} />)
          )}
        </Card>
      </div>
    </div>
  );
}
