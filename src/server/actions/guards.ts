import "server-only";

import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { advances, attendance, settlements } from "../db/schema";
import { toAdvance, toAttendance, toSettlement, toWorker } from "../queries/mappers";
import { todayIST } from "../today";
import { daysBetween, monthDates, monthOf } from "@/lib/date";
import { EDIT_WINDOW_DAYS, type LedgerState } from "@/lib/ledger";
import type { EngagementRow, WorkerRow } from "../db/schema";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && ISO_DATE.test(s) && !Number.isNaN(Date.parse(s));
}

export function isMonth(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}$/.test(s);
}

/** Within the 7-day edit window (today included). */
export function inEditWindow(date: string, today = todayIST()): boolean {
  const diff = daysBetween(date, today);
  return diff >= 0 && diff <= EDIT_WINDOW_DAYS;
}

export async function isMonthFinalized(engagementId: string, month: string): Promise<boolean> {
  const row = await db.query.settlements.findFirst({
    where: and(eq(settlements.engagementId, engagementId), eq(settlements.month, month)),
  });
  return Boolean(row);
}

/** Latest attendance row for a day, or null when nobody marked it. */
export async function latestEntry(engagementId: string, date: string) {
  const rows = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.engagementId, engagementId), eq(attendance.date, date)))
    .orderBy(desc(attendance.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/** A single-engagement ledger for one month, so server-side math reuses the shared ledger code. */
export async function monthLedger(e: EngagementRow, w: WorkerRow, month: string): Promise<LedgerState> {
  const dates = monthDates(month);
  const first = dates[0];
  const last = dates[dates.length - 1];
  const [att, adv, sett] = await Promise.all([
    db
      .select()
      .from(attendance)
      .where(and(eq(attendance.engagementId, e.id), gte(attendance.date, first), lte(attendance.date, last))),
    db.select().from(advances).where(and(eq(advances.engagementId, e.id), gte(advances.date, first), lte(advances.date, last))),
    db.select().from(settlements).where(eq(settlements.engagementId, e.id)),
  ]);
  return {
    today: todayIST(),
    workers: [toWorker(e, w)],
    attendance: att.map(toAttendance),
    advances: adv.map(toAdvance),
    settlements: sett.map(toSettlement),
    reminders: [],
  };
}

export { monthOf };
