import "server-only";

import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "../db";
import { advances, attendance, engagements, households, reminders, settlements, workers } from "../db/schema";
import { toAdvance, toAttendance, toHousehold, toReminder, toSettlement, toWorker } from "./mappers";
import { todayIST } from "../today";
import { addMonths, monthOf } from "@/lib/date";
import type { Household } from "@/lib/types";
import type { LedgerState } from "@/lib/ledger";

export interface HouseholdState extends LedgerState {
  household: Household;
}

/** How far back the household screens load. Older months come from settlements. */
const HISTORY_MONTHS = 3;

async function findHouseholdByOwner(ownerUserId: string) {
  return db.query.households.findFirst({ where: eq(households.ownerUserId, ownerUserId) });
}

/** Everything the household UI needs, in the exact shape the client store consumes. */
export async function loadHouseholdState(ownerUserId: string): Promise<HouseholdState | null> {
  const household = await findHouseholdByOwner(ownerUserId);
  if (!household) return null;

  const today = todayIST();
  const since = `${addMonths(monthOf(today), -HISTORY_MONTHS)}-01`;

  const rows = await db
    .select({ e: engagements, w: workers })
    .from(engagements)
    .innerJoin(workers, eq(engagements.workerId, workers.id))
    .where(eq(engagements.householdId, household.id))
    .orderBy(engagements.createdAt);

  const ids = rows.map((r) => r.e.id);
  if (ids.length === 0) {
    return { today, household: toHousehold(household), workers: [], attendance: [], advances: [], settlements: [], reminders: [] };
  }

  const [att, adv, sett, rem] = await Promise.all([
    db.select().from(attendance).where(and(inArray(attendance.engagementId, ids), gte(attendance.date, since))),
    db.select().from(advances).where(and(inArray(advances.engagementId, ids), gte(advances.date, since))),
    db.select().from(settlements).where(inArray(settlements.engagementId, ids)),
    db.select().from(reminders).where(and(inArray(reminders.engagementId, ids), gte(reminders.date, since))),
  ]);

  return {
    today,
    household: toHousehold(household),
    workers: rows.map((r) => toWorker(r.e, r.w)),
    attendance: att.map(toAttendance),
    advances: adv.map(toAdvance),
    settlements: sett.map(toSettlement),
    reminders: rem.map(toReminder),
  };
}

/** An engagement the given owner is allowed to touch, or null. */
export async function ownedEngagement(ownerUserId: string, engagementId: string) {
  const row = await db
    .select({ e: engagements })
    .from(engagements)
    .innerJoin(households, eq(engagements.householdId, households.id))
    .where(and(eq(engagements.id, engagementId), eq(households.ownerUserId, ownerUserId)))
    .limit(1);
  return row[0]?.e ?? null;
}
