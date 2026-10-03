/**
 * What each push notification says and where tapping it goes. Pure, so the
 * same text is produced in tests and on the server, in the device's language.
 */
import { formatDayMonth, formatMonthLong } from "./date";
import { dayInfo, monthSummary, pendingItems, type LedgerState } from "./ledger";
import { translate } from "./messages";
import { formatINR } from "./money";
import type { Gender, Lang } from "./types";

interface Person {
  name: string;
  gender: Gender;
}

export type PushEvent =
  // to the household
  | { kind: "claim"; worker: Person; engagementId: string; date: string; today: string }
  | { kind: "dispute"; worker: Person; engagementId: string; date: string }
  | { kind: "leave"; worker: Person; engagementId: string; date: string; reason?: string }
  | { kind: "remind"; worker: Person; engagementId: string; date: string }
  | { kind: "daily"; unmarkedToday: Person[]; olderPending: number }
  | { kind: "monthStart"; month: string }
  // to the worker
  | { kind: "leaveMarked"; token: string; house: string }
  | { kind: "settled"; token: string; house: string; month: string; amount: number };

export interface PushMessage {
  title: string;
  body: string;
  /** Path to open when the notification is tapped. */
  url: string;
  /** Notifications with the same tag replace each other instead of piling up. */
  tag: string;
}

const REASON_KEYS: Record<string, string> = {
  sick: "worker.reasonSick",
  village: "worker.reasonVillage",
  festival: "worker.reasonFestival",
  other: "worker.reasonOther",
};

export function buildPush(event: PushEvent, lang: Lang): PushMessage {
  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
  const day = (iso: string) => formatDayMonth(iso, lang);

  switch (event.kind) {
    case "claim": {
      const isToday = event.date === event.today;
      return {
        title: t("push.claimTitle"),
        body: t(isToday ? "push.claimToday" : "push.claimOn", { name: event.worker.name, gender: event.worker.gender, date: day(event.date) }),
        url: "/today",
        tag: `claim-${event.engagementId}-${event.date}`,
      };
    }
    case "dispute":
      return {
        title: t("push.disputeTitle"),
        body: t("push.dispute", { name: event.worker.name, gender: event.worker.gender, date: day(event.date) }),
        url: "/inbox",
        tag: `dispute-${event.engagementId}-${event.date}`,
      };
    case "leave": {
      const reasonKey = event.reason ? REASON_KEYS[event.reason] : undefined;
      return {
        title: t("push.leaveTitle"),
        body: reasonKey
          ? t("push.leaveWithReason", { name: event.worker.name, date: day(event.date), reason: t(reasonKey) })
          : t("push.leave", { name: event.worker.name, date: day(event.date) }),
        url: "/calendar",
        tag: `leave-${event.engagementId}`,
      };
    }
    case "remind":
      return {
        title: t("push.remindTitle"),
        body: t("push.remind", { name: event.worker.name, gender: event.worker.gender, date: day(event.date) }),
        url: "/inbox",
        tag: `remind-${event.engagementId}-${event.date}`,
      };
    case "daily": {
      const [first] = event.unmarkedToday;
      const head =
        event.unmarkedToday.length === 1
          ? t("push.dailyOne", { name: first.name, gender: first.gender })
          : event.unmarkedToday.length > 1
            ? t("push.dailyMany", { count: event.unmarkedToday.length, names: event.unmarkedToday.map((w) => w.name).join(", ") })
            : "";
      const tail = event.olderPending > 0 ? t("push.dailyOlder", { count: event.olderPending }) : "";
      return {
        title: t("push.dailyTitle"),
        body: [head, tail].filter(Boolean).join(" "),
        url: event.unmarkedToday.length > 0 ? "/today" : "/inbox",
        tag: "daily",
      };
    }
    case "monthStart":
      return {
        title: t("push.monthTitle"),
        body: t("push.monthStart", { month: formatMonthLong(event.month, lang) }),
        url: "/hisaab",
        tag: `month-${event.month}`,
      };
    case "leaveMarked":
      return {
        title: event.house,
        body: t("push.leaveMarked"),
        url: `/w/${event.token}`,
        tag: `leave-marked-${event.token}`,
      };
    case "settled":
      return {
        title: event.house,
        body: t("push.settled", { month: formatMonthLong(event.month, lang), amount: formatINR(event.amount) }),
        url: `/w/${event.token}/hisaab`,
        tag: `settled-${event.token}-${event.month}`,
      };
  }
}

/**
 * The evening reminders a household should get, if any. Never nags: returns
 * nothing when everything is filled in. On the 1st it also asks to settle
 * last month for workers whose month is still open.
 */
export function dailyEvents(state: LedgerState): PushEvent[] {
  const events: PushEvent[] = [];
  const active = state.workers.filter((w) => !w.endDate);

  const unmarkedToday = active
    .filter((w) => dayInfo(state, w, state.today).state === "unknown")
    .map((w) => ({ name: w.name, gender: w.gender }));
  const olderPending = pendingItems(state).filter((p) => p.date !== state.today && p.info.state === "unknown").length;
  if (unmarkedToday.length > 0 || olderPending > 0) events.push({ kind: "daily", unmarkedToday, olderPending });

  if (state.today.endsWith("-01")) {
    const [y, m] = state.today.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    const month = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    const open = active.some((w) => w.startDate <= `${month}-31` && !monthSummary(state, w, month).settlement);
    if (open) events.push({ kind: "monthStart", month });
  }
  return events;
}
