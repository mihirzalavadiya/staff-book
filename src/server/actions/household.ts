"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "../db";
import { advances, attendance, engagements, households, settlements, workers } from "../db/schema";
import { getAuthUser } from "../auth/supabase";
import { ownedEngagement } from "../queries/household";
import { todayIST } from "../today";
import { inEditWindow, isIsoDate, isMonth, isMonthFinalized, latestEntry, monthLedger, monthOf } from "./guards";
import { fail, ok, type ActionResult } from "./result";
import { notifyWorker } from "../push/notify";
import { monthSummary } from "@/lib/ledger";
import { phoneKey } from "@/lib/phone";
import type { AvatarTone, Gender, Lang, Role } from "@/lib/types";

/**
 * Household-side mutations. Every action re-checks the session and that the
 * engagement belongs to this owner; the client is never trusted.
 */

async function requireOwner() {
  const user = await getAuthUser();
  if (!user) throw new Error("unauthenticated");
  return user;
}

async function requireEngagement(engagementId: string) {
  const user = await requireOwner();
  const e = await ownedEngagement(user.id, engagementId);
  if (!e) throw new Error("forbidden");
  return { user, e };
}

function refresh() {
  revalidatePath("/", "layout");
}

async function canEditDay(engagementId: string, date: string): Promise<string | null> {
  const today = todayIST();
  if (date > today) return "future";
  if (inEditWindow(date, today)) return null;
  // Beyond the window a day can only be touched from the settlement flow, i.e. while the month is open.
  return (await isMonthFinalized(engagementId, monthOf(date))) ? "finalized" : null;
}

export async function markDay(input: { engagementId: string; date: string; state: "present" | "leave" }): Promise<ActionResult> {
  try {
    const { e } = await requireEngagement(input.engagementId);
    if (!isIsoDate(input.date)) return fail("bad date");
    const blocked = await canEditDay(e.id, input.date);
    if (blocked) return fail(blocked);
    await db.insert(attendance).values({ engagementId: e.id, date: input.date, state: input.state, markedBy: "household" });
    // Leave counts against the worker, so they hear about it the same day and can dispute it.
    if (input.state === "leave" && input.date === todayIST()) {
      notifyWorker(e.id, (w) => ({ kind: "leaveMarked", ...w }));
    }
    refresh();
    return ok();
  } catch (err) {
    return fail((err as Error).message);
  }
}

export async function confirmClaim(input: { engagementId: string; date: string }): Promise<ActionResult> {
  try {
    const { e } = await requireEngagement(input.engagementId);
    const last = await latestEntry(e.id, input.date);
    if (last?.state !== "claim") return fail("no claim");
    await db.insert(attendance).values({ engagementId: e.id, date: input.date, state: "present", markedBy: "household" });
    refresh();
    return ok();
  } catch (err) {
    return fail((err as Error).message);
  }
}

/** Rejecting a claim records leave and opens a dispute, so the disagreement stays visible. */
export async function rejectClaim(input: { engagementId: string; date: string }): Promise<ActionResult> {
  try {
    const { e } = await requireEngagement(input.engagementId);
    const last = await latestEntry(e.id, input.date);
    if (last?.state !== "claim") return fail("no claim");
    await db.insert(attendance).values([
      { engagementId: e.id, date: input.date, state: "leave", markedBy: "household" },
      { engagementId: e.id, date: input.date, state: "dispute", markedBy: "household", note: "claim-rejected" },
    ]);
    refresh();
    return ok();
  } catch (err) {
    return fail((err as Error).message);
  }
}

export async function resolveDispute(input: { engagementId: string; date: string; resolution: "present" | "leave" }): Promise<ActionResult> {
  try {
    const { e } = await requireEngagement(input.engagementId);
    const last = await latestEntry(e.id, input.date);
    if (last?.state !== "dispute") return fail("no dispute");
    await db.insert(attendance).values({
      engagementId: e.id,
      date: input.date,
      state: input.resolution,
      markedBy: "household",
      note: "dispute-resolved",
    });
    refresh();
    return ok();
  } catch (err) {
    return fail((err as Error).message);
  }
}

export async function addAdvance(input: { engagementId: string; amount: number; date: string; note?: string }): Promise<ActionResult> {
  try {
    const { e } = await requireEngagement(input.engagementId);
    const amount = Math.round(Number(input.amount));
    if (!Number.isFinite(amount) || amount <= 0) return fail("bad amount");
    if (!isIsoDate(input.date)) return fail("bad date");
    if (await isMonthFinalized(e.id, monthOf(input.date))) return fail("finalized");
    await db.insert(advances).values({ engagementId: e.id, amount, date: input.date, note: input.note?.trim() || null });
    refresh();
    return ok();
  } catch (err) {
    return fail((err as Error).message);
  }
}

/** Finalizes a month. The numbers are recomputed here; the client's figures are never trusted. */
export async function finalizeMonth(input: { engagementId: string; month: string }): Promise<ActionResult<{ amountDue: number }>> {
  try {
    const { e } = await requireEngagement(input.engagementId);
    if (!isMonth(input.month)) return fail("bad month");
    const w = await db.query.workers.findFirst({ where: eq(workers.id, e.workerId) });
    if (!w) return fail("no worker");
    const ledger = await monthLedger(e, w, input.month);
    const s = monthSummary(ledger, ledger.workers[0], input.month);
    if (s.pending.length > 0) return fail("pending");
    await db
      .insert(settlements)
      .values({
        engagementId: e.id,
        month: input.month,
        workingDays: s.workingDays,
        daysPresent: s.present,
        daysLeave: s.leave,
        paidLeaveUsed: s.paidLeaveUsed,
        unpaidDeduction: s.deduction,
        advanceDeducted: s.advanceTotal,
        amountDue: s.amountDue,
      })
      .onConflictDoNothing();
    notifyWorker(e.id, (w) => ({ kind: "settled", ...w, month: input.month, amount: s.amountDue }));
    refresh();
    return ok({ amountDue: s.amountDue });
  } catch (err) {
    return fail((err as Error).message);
  }
}

export async function markPaid(input: { engagementId: string; month: string }): Promise<ActionResult> {
  try {
    const { e } = await requireEngagement(input.engagementId);
    await db
      .update(settlements)
      .set({ paidAt: new Date() })
      .where(and(eq(settlements.engagementId, e.id), eq(settlements.month, input.month)));
    refresh();
    return ok();
  } catch (err) {
    return fail((err as Error).message);
  }
}

function makeToken(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 12) || "w";
  return `${slug}-${randomBytes(9).toString("base64url")}`;
}

const TONES: AvatarTone[] = ["purple", "blue", "green", "yellow", "peach"];

const ROLE_LABEL_MAX = 30;

export async function addWorker(input: {
  name: string;
  gender: Gender;
  role: Role;
  roleLabel?: string;
  salary: number;
  phone?: string;
  workDays: number[];
  paidLeaves: number;
  language: Lang;
}): Promise<ActionResult<{ engagementId: string; token: string; alreadyOnStaffbook: boolean }>> {
  try {
    const user = await requireOwner();
    const household = await db.query.households.findFirst({ where: eq(households.ownerUserId, user.id) });
    if (!household) return fail("no household");
    const name = input.name.trim();
    const salary = Math.round(Number(input.salary));
    const workDays = [...new Set(input.workDays)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
    if (!name || !Number.isFinite(salary) || salary <= 0 || workDays.length === 0) return fail("invalid");
    const roleLabel = input.role === "other" ? input.roleLabel?.trim().slice(0, ROLE_LABEL_MAX) || null : null;
    if (input.role === "other" && !roleLabel) return fail("role label");

    const count = await db.$count(engagements, eq(engagements.householdId, household.id));
    const token = makeToken(name);
    const key = phoneKey(input.phone);
    // Someone with this number already works in another home: offer to join, never auto-merge.
    const existing = key
      ? await db
          .select({ id: workers.id })
          .from(workers)
          .innerJoin(engagements, eq(engagements.workerId, workers.id))
          .where(and(eq(workers.phoneKey, key), eq(engagements.status, "active"), ne(engagements.householdId, household.id)))
          .orderBy(desc(workers.createdAt))
          .limit(1)
      : [];
    const linkTo = existing[0]?.id ?? null;

    const result = await db.transaction(async (tx) => {
      const [w] = await tx
        .insert(workers)
        .values({
          name,
          gender: input.gender === "male" ? "male" : "female",
          phone: input.phone?.trim() || null,
          phoneKey: key,
          language: input.language,
        })
        .returning();
      const [e] = await tx
        .insert(engagements)
        .values({
          householdId: household.id,
          workerId: w.id,
          role: input.role,
          roleLabel,
          monthlySalary: salary,
          workDays,
          paidLeavesPerMonth: Math.min(10, Math.max(0, Math.round(input.paidLeaves))),
          tone: TONES[count % TONES.length],
          startDate: todayIST(),
          workerToken: token,
          linkToWorkerId: linkTo,
        })
        .returning();
      return e;
    });
    refresh();
    return ok({ engagementId: result.id, token, alreadyOnStaffbook: linkTo !== null });
  } catch (err) {
    return fail((err as Error).message);
  }
}

export async function endWork(input: { engagementId: string; endDate: string }): Promise<ActionResult> {
  try {
    const { e } = await requireEngagement(input.engagementId);
    if (!isIsoDate(input.endDate)) return fail("bad date");
    await db.update(engagements).set({ endDate: input.endDate, status: "archived" }).where(eq(engagements.id, e.id));
    refresh();
    return ok();
  } catch (err) {
    return fail((err as Error).message);
  }
}

export async function updateHousehold(input: { name?: string; homeLabel?: string; notifyAt?: string; language?: Lang }): Promise<ActionResult> {
  try {
    const user = await requireOwner();
    const patch: Partial<typeof households.$inferInsert> = {};
    if (input.name?.trim()) patch.name = input.name.trim();
    if (input.homeLabel !== undefined) patch.homeLabel = input.homeLabel.trim() || null;
    if (input.notifyAt && /^\d{2}:\d{2}$/.test(input.notifyAt)) patch.notifyAt = input.notifyAt;
    if (input.language) patch.language = input.language;
    if (Object.keys(patch).length === 0) return ok();
    await db.update(households).set(patch).where(eq(households.ownerUserId, user.id));
    refresh();
    return ok();
  } catch (err) {
    return fail((err as Error).message);
  }
}

export async function updateWorker(input: {
  engagementId: string;
  gender?: Gender;
  roleLabel?: string;
  salary?: number;
  paidLeaves?: number;
  workDays?: number[];
  language?: Lang;
  phone?: string;
}): Promise<ActionResult<{ alreadyOnStaffbook: boolean }>> {
  try {
    const { e } = await requireEngagement(input.engagementId);

    // Terms of work belong to this home.
    const ePatch: Partial<typeof engagements.$inferInsert> = {};
    if (input.salary !== undefined) {
      const salary = Math.round(Number(input.salary));
      if (!Number.isFinite(salary) || salary <= 0) return fail("invalid");
      ePatch.monthlySalary = salary;
    }
    if (input.paidLeaves !== undefined) ePatch.paidLeavesPerMonth = Math.min(10, Math.max(0, Math.round(input.paidLeaves)));
    if (input.workDays !== undefined) {
      const days = [...new Set(input.workDays)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
      if (days.length === 0) return fail("invalid");
      ePatch.workDays = days;
    }
    if (input.roleLabel !== undefined && e.role === "other") {
      const label = input.roleLabel.trim().slice(0, ROLE_LABEL_MAX);
      if (!label) return fail("role label");
      ePatch.roleLabel = label;
    }

    // Details of the person. Once they are linked to other homes, this home cannot change them.
    const wPatch: Partial<typeof workers.$inferInsert> = {};
    if (input.language) wPatch.language = input.language;
    if (input.gender) wPatch.gender = input.gender === "male" ? "male" : "female";
    let key: string | null | undefined;
    if (input.phone !== undefined) {
      key = phoneKey(input.phone);
      wPatch.phone = input.phone.trim() || null;
      wPatch.phoneKey = key;
    }
    if (Object.keys(wPatch).length) {
      const homes = await db.$count(engagements, and(eq(engagements.workerId, e.workerId), ne(engagements.householdId, e.householdId)));
      if (homes > 0) return fail("shared");
    }

    // A new number that belongs to someone already working elsewhere becomes an invite, as on add.
    let linkTo: string | null = null;
    if (key && !e.linkToWorkerId) {
      const match = await db
        .select({ id: workers.id })
        .from(workers)
        .innerJoin(engagements, eq(engagements.workerId, workers.id))
        .where(
          and(
            eq(workers.phoneKey, key),
            ne(workers.id, e.workerId),
            eq(engagements.status, "active"),
            ne(engagements.householdId, e.householdId),
          ),
        )
        .orderBy(desc(workers.createdAt))
        .limit(1);
      linkTo = match[0]?.id ?? null;
      if (linkTo) ePatch.linkToWorkerId = linkTo;
    }

    await db.transaction(async (tx) => {
      if (Object.keys(ePatch).length) await tx.update(engagements).set(ePatch).where(eq(engagements.id, e.id));
      if (Object.keys(wPatch).length) await tx.update(workers).set(wPatch).where(eq(workers.id, e.workerId));
    });
    refresh();
    return ok({ alreadyOnStaffbook: linkTo !== null });
  } catch (err) {
    return fail((err as Error).message);
  }
}
