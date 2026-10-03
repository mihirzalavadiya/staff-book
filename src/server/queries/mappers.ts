import "server-only";

import type { AdvanceRow, AttendanceRow, EngagementRow, HouseholdRow, ReminderRow, SettlementRow, WorkerRow } from "../db/schema";
import type { Advance, AttendanceEntry, Household, Reminder, Settlement, Worker } from "@/lib/types";

/**
 * The UI works with one flat `Worker` per engagement (name + salary + schedule),
 * so an engagement row joined to its worker row maps to exactly that.
 */
export function toWorker(e: EngagementRow, w: WorkerRow, sharedWithOtherHomes = false): Worker {
  return {
    id: e.id,
    name: w.name,
    gender: w.gender,
    role: e.role,
    roleLabel: e.roleLabel ?? undefined,
    salary: e.monthlySalary,
    linkPending: e.linkToWorkerId ? true : undefined,
    sharedWithOtherHomes: sharedWithOtherHomes || undefined,
    tone: e.tone,
    workDays: e.workDays,
    paidLeavesPerMonth: e.paidLeavesPerMonth,
    phone: w.phone ?? "",
    language: w.language,
    startDate: e.startDate,
    endDate: e.endDate ?? undefined,
    token: e.workerToken,
  };
}

export function toAttendance(a: AttendanceRow): AttendanceEntry {
  return {
    id: a.id,
    workerId: a.engagementId,
    date: a.date,
    state: a.state,
    markedBy: a.markedBy === "system" ? "household" : a.markedBy,
    at: a.createdAt.toISOString(),
    note: a.note ?? undefined,
    voiceSeconds: a.voiceSeconds ?? undefined,
  };
}

export function toAdvance(a: AdvanceRow): Advance {
  return { id: a.id, workerId: a.engagementId, amount: a.amount, date: a.date, note: a.note ?? undefined };
}

export function toSettlement(s: SettlementRow): Settlement {
  return {
    workerId: s.engagementId,
    month: s.month,
    amountDue: s.amountDue,
    finalizedAt: s.finalizedAt.toISOString(),
    paidAt: s.paidAt?.toISOString(),
  };
}

export function toReminder(r: ReminderRow): Reminder {
  return { workerId: r.engagementId, date: r.date, at: r.createdAt.toISOString() };
}

export function toHousehold(h: HouseholdRow): Household {
  return {
    id: h.id,
    name: h.name,
    flat: h.flat ?? "",
    ownerName: h.ownerName,
    homeLabel: h.homeLabel ?? "",
    notifyAt: h.notifyAt.slice(0, 5),
  };
}
