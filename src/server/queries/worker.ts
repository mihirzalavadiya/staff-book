import "server-only";

import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "../db";
import { advances, attendance, engagements, households, reminders, settlements, workers } from "../db/schema";
import { homeLabel } from "@/lib/home";
import { toAdvance, toAttendance, toReminder, toSettlement, toWorker } from "./mappers";
import { todayIST } from "../today";
import { addMonths, monthOf } from "@/lib/date";
import type { Engagement } from "@/lib/types";
import type { LedgerState } from "@/lib/ledger";

export interface WorkerState extends LedgerState {
  /** The worker whose link this is. */
  me: { id: string; name: string; gender: "female" | "male"; language: "en" | "hi" };
  /** One house per engagement, keyed by engagement id (same id as `workers[i].id`). */
  houses: Engagement[];
  /** Homes that added this person's phone and are waiting for them to confirm. */
  invites: Engagement[];
}

const HISTORY_MONTHS = 2;

/** Resolve a secret link token to its engagement, if active. */
export async function engagementByToken(token: string) {
  return db.query.engagements.findFirst({
    where: and(eq(engagements.workerToken, token), eq(engagements.status, "active")),
  });
}

/**
 * Everything the worker screens need. A token identifies one engagement, and
 * from it we show every active house of the same worker person.
 */
export async function loadWorkerState(token: string): Promise<WorkerState | null> {
  const mine = await engagementByToken(token);
  if (!mine) return null;

  const today = todayIST();
  const since = `${addMonths(monthOf(today), -HISTORY_MONTHS)}-01`;

  const rows = await db
    .select({ e: engagements, w: workers, h: households })
    .from(engagements)
    .innerJoin(workers, eq(engagements.workerId, workers.id))
    .innerJoin(households, eq(engagements.householdId, households.id))
    .where(and(eq(engagements.workerId, mine.workerId), eq(engagements.status, "active")))
    .orderBy(engagements.createdAt);

  const ids = rows.map((r) => r.e.id);
  const [att, adv, sett, rem] = await Promise.all([
    db.select().from(attendance).where(and(inArray(attendance.engagementId, ids), gte(attendance.date, since))),
    db.select().from(advances).where(and(inArray(advances.engagementId, ids), gte(advances.date, since))),
    db.select().from(settlements).where(inArray(settlements.engagementId, ids)),
    db.select().from(reminders).where(and(inArray(reminders.engagementId, ids), gte(reminders.date, since))),
  ]);

  const me = rows.find((r) => r.e.id === mine.id)!;
  const inviteRows = await db
    .select({ e: engagements, h: households })
    .from(engagements)
    .innerJoin(households, eq(engagements.householdId, households.id))
    .where(and(eq(engagements.linkToWorkerId, mine.workerId), eq(engagements.status, "active")))
    .orderBy(engagements.createdAt);
  const asHouse = (r: { e: typeof engagements.$inferSelect; h: typeof households.$inferSelect }): Engagement => ({
    id: r.e.id,
    houseName: homeLabel(r.h.name, r.h.flat),
    role: r.e.role,
    roleLabel: r.e.roleLabel ?? undefined,
    salary: r.e.monthlySalary,
    tone: r.e.tone,
    initial: r.h.name.trim()[0]?.toUpperCase() ?? "?",
  });
  return {
    today,
    me: { id: me.w.id, name: me.w.name, gender: me.w.gender, language: me.w.language },
    houses: rows.map(asHouse),
    invites: inviteRows.map(asHouse),
    workers: rows.map((r) => toWorker(r.e, r.w)),
    attendance: att.map(toAttendance),
    advances: adv.map(toAdvance),
    settlements: sett.map(toSettlement),
    reminders: rem.map(toReminder),
  };
}

/** True when `engagementId` belongs to the same worker person as `token`. */
export async function tokenCanAct(token: string, engagementId: string): Promise<boolean> {
  const mine = await engagementByToken(token);
  if (!mine) return false;
  if (mine.id === engagementId) return true;
  const other = await db.query.engagements.findFirst({
    where: and(eq(engagements.id, engagementId), eq(engagements.workerId, mine.workerId), eq(engagements.status, "active")),
  });
  return Boolean(other);
}
