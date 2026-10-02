"use client";

import { formatDayMonth } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import type { PendingItem } from "@/lib/ledger";
import { useAct, useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StateIcon } from "@/components/ui/StateIcon";
import { cn } from "@/lib/cn";

/**
 * A pending day with its fix right there. This is the settlement screen's
 * resolve list: the only place days older than the 7-day window can change.
 */
export function ResolveRow({ item, className }: { item: PendingItem; className?: string }) {
  const { t, lang } = useI18n();
  const { state } = useStore();
  const act = useAct();
  const { worker, date, info, reminder } = item;
  const g = { gender: worker.gender };
  const label = date === state.today ? t("common.todayLabel") : formatDayMonth(date, lang);
  const sub = reminder
    ? t("inbox.reminded")
    : info.state === "dispute"
      ? t("home.disputeSummary", { name: worker.name, ...g })
      : info.state === "claim"
        ? t("state.claim", g)
        : t("home.nobodyMarked");

  return (
    <div className={cn("py-3", className)}>
      <div className="flex items-center gap-3">
        <StateIcon state={info.state} size={34} />
        <div className="min-w-0 flex-1 leading-[1.3]">
          <div className="font-bold">{label}</div>
          <div className="truncate text-xs text-muted">{sub}</div>
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2 pl-[46px]">
        {info.state === "claim" ? (
          <>
            <Button size="md" {...act({ type: "confirmClaim", workerId: worker.id, date })}>
              <Icon name="check" size={14} />
              {t("common.yes")}
            </Button>
            <Button size="md" variant="outline" {...act({ type: "rejectClaim", workerId: worker.id, date })}>
              <Icon name="x" size={12} />
              {t("common.no")}
            </Button>
          </>
        ) : info.state === "dispute" ? (
          <>
            <Button size="md" {...act({ type: "resolveDispute", workerId: worker.id, date, resolution: "present" })}>
              <Icon name="check" size={14} />
              {t("calendar.confirmPresent", g)}
            </Button>
            <Button size="md" variant="outline" {...act({ type: "resolveDispute", workerId: worker.id, date, resolution: "leave" })}>
              <Icon name="x" size={12} />
              {t("calendar.keepLeave")}
            </Button>
          </>
        ) : (
          <>
            <Button size="md" {...act({ type: "mark", workerId: worker.id, date, state: "present", by: "household" })}>
              <Icon name="check" size={14} />
              {t("home.markPresent", g)}
            </Button>
            <Button size="md" variant="soft" {...act({ type: "mark", workerId: worker.id, date, state: "leave", by: "household" })}>
              <Icon name="x" size={12} />
              {t("home.markLeave")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
