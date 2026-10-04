"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { attendance, engagements, reminders, workers } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { engagementByToken, tokenCanAct } from "../queries/worker";
import { todayIST } from "../today";
import { inEditWindow, isIsoDate, isMonthFinalized, latestEntry, monthOf } from "./guards";
import { fail, ok, type ActionResult } from "./result";
import { notifyHousehold } from "../push/notify";
import { announce, type LiveTarget } from "../live";

/**
 * Worker-side mutations. The secret token is the identity; each action checks
 * it maps to the engagement being touched. Rule from the spec: entries against
 * your own interest (leave) are final, entries in your favour (came) are claims.
 */

/** Re-renders this link's pages and rings the live-update bell for everyone else who sees the change. */
function refresh(...targets: LiveTarget[]) {
  revalidatePath("/", "layout");
  announce(...targets);
}

export async function workerMark(input: {
  token: string;
  engagementId: string;
  date: string;
  state: "present" | "leave";
  note?: string;
}): Promise<ActionResult> {
  try {
    if (!(await tokenCanAct(input.token, input.engagementId))) return fail("forbidden");
    if (!isIsoDate(input.date)) return fail("bad date");
    const today = todayIST();
    if (input.state === "present") {
      // "I came" is a claim, only for today or the last 7 days.
      if (!inEditWindow(input.date, today)) return fail("window");
      const last = await latestEntry(input.engagementId, input.date);
      if (last && last.state !== "claim") return fail("already marked");
      await db.insert(attendance).values({ engagementId: input.engagementId, date: input.date, state: "claim", markedBy: "worker" });
      notifyHousehold(input.engagementId, (worker) => ({ kind: "claim", worker, engagementId: input.engagementId, date: input.date, today }));
    } else {
      // Leave is final and may be planned ahead; a finalized month cannot change.
      if (await isMonthFinalized(input.engagementId, monthOf(input.date))) return fail("finalized");
      if (input.date < today && !inEditWindow(input.date, today)) return fail("window");
      await db.insert(attendance).values({
        engagementId: input.engagementId,
        date: input.date,
        state: "leave",
        markedBy: "worker",
        note: input.note?.trim() || null,
      });
      notifyHousehold(input.engagementId, (worker) => ({
        kind: "leave",
        worker,
        engagementId: input.engagementId,
        date: input.date,
        reason: input.note?.trim() || undefined,
      }));
    }
    refresh({ engagementIds: [input.engagementId] });
    return ok();
  } catch (err) {
    return fail((err as Error).message);
  }
}

export async function workerRaiseDispute(input: {
  token: string;
  engagementId: string;
  date: string;
  note: string;
  voiceSeconds?: number;
}): Promise<ActionResult> {
  try {
    if (!(await tokenCanAct(input.token, input.engagementId))) return fail("forbidden");
    if (!isIsoDate(input.date)) return fail("bad date");
    const last = await latestEntry(input.engagementId, input.date);
    // Only a household-recorded day can be disputed, and only once at a time.
    if (!last || last.markedBy !== "household" || last.state === "dispute") return fail("nothing to dispute");
    if (await isMonthFinalized(input.engagementId, monthOf(input.date))) return fail("finalized");
    await db.insert(attendance).values({
      engagementId: input.engagementId,
      date: input.date,
      state: "dispute",
      markedBy: "worker",
      note: input.note.slice(0, 80),
      voiceSeconds: input.voiceSeconds ? Math.min(600, Math.round(input.voiceSeconds)) : null,
    });
    notifyHousehold(input.engagementId, (worker) => ({ kind: "dispute", worker, engagementId: input.engagementId, date: input.date }));
    refresh({ engagementIds: [input.engagementId] });
    return ok();
  } catch (err) {
    return fail((err as Error).message);
  }
}

/** "Remind them": recorded so the household sees the nudge at the top of Pending. Push comes later. */
export async function workerRemind(input: { token: string; engagementId: string; date: string }): Promise<ActionResult> {
  try {
    if (!(await tokenCanAct(input.token, input.engagementId))) return fail("forbidden");
    if (!isIsoDate(input.date) || input.date > todayIST()) return fail("bad date");
    const last = await latestEntry(input.engagementId, input.date);
    if (last) return fail("already marked");
    await db
      .insert(reminders)
      .values({ engagementId: input.engagementId, date: input.date })
      .onConflictDoUpdate({ target: [reminders.engagementId, reminders.date], set: { createdAt: new Date() } });
    notifyHousehold(input.engagementId, (worker) => ({ kind: "remind", worker, engagementId: input.engagementId, date: input.date }));
    refresh({ engagementIds: [input.engagementId] });
    return ok();
  } catch (err) {
    return fail((err as Error).message);
  }
}

/**
 * A home added this worker's phone. Only the worker's existing link can say
 * yes, so a home cannot join someone's other homes just by typing their number.
 * Yes: the home moves onto this person's link. No: it stays a separate person.
 */
export async function workerRespondInvite(input: { token: string; engagementId: string; accept: boolean }): Promise<ActionResult> {
  try {
    const mine = await engagementByToken(input.token);
    if (!mine) return fail("forbidden");
    const invite = await db.query.engagements.findFirst({
      where: and(eq(engagements.id, input.engagementId), eq(engagements.linkToWorkerId, mine.workerId)),
    });
    if (!invite) return fail("no invite");

    if (!input.accept) {
      await db.update(engagements).set({ linkToWorkerId: null }).where(eq(engagements.id, invite.id));
      refresh({ engagementIds: [invite.id] }, { workerId: mine.workerId });
      return ok();
    }

    const placeholder = invite.workerId;
    await db.transaction(async (tx) => {
      await tx.update(engagements).set({ workerId: mine.workerId, linkToWorkerId: null }).where(eq(engagements.id, invite.id));
      // The home created a fresh worker row for this number; drop it once nothing points to it.
      const stillUsed = await tx.$count(engagements, eq(engagements.workerId, placeholder));
      if (stillUsed === 0) await tx.delete(workers).where(eq(workers.id, placeholder));
    });
    refresh({ engagementIds: [invite.id] });
    return ok();
  } catch (err) {
    return fail((err as Error).message);
  }
}
