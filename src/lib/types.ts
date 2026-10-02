export type DayState = "present" | "leave" | "claim" | "dispute" | "unknown" | "off";

export type Role = "cook" | "maid" | "driver" | "milk" | "other";

export type AvatarTone = "purple" | "blue" | "green" | "yellow" | "peach";

export type Side = "household" | "worker";

export type Lang = "en" | "hi";

export type Gender = "female" | "male";

export interface Household {
  id: string;
  name: string;
  ownerName: string;
  homeLabel: string;
  notifyAt: string;
}

export interface Worker {
  id: string;
  name: string;
  gender: Gender;
  role: Role;
  /** Custom work name when role is "other". */
  roleLabel?: string;
  salary: number;
  tone: AvatarTone;
  /** 0 = Sunday … 6 = Saturday */
  workDays: number[];
  paidLeavesPerMonth: number;
  phone: string;
  language: Lang;
  startDate: string;
  endDate?: string;
  token: string;
}

export interface AttendanceEntry {
  id: string;
  workerId: string;
  /** YYYY-MM-DD */
  date: string;
  state: Exclude<DayState, "off" | "unknown">;
  markedBy: Side;
  /** ISO timestamp */
  at: string;
  note?: string;
  voiceSeconds?: number;
}

export interface Advance {
  id: string;
  workerId: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Settlement {
  workerId: string;
  /** YYYY-MM */
  month: string;
  amountDue: number;
  finalizedAt?: string;
  paidAt?: string;
}

/** A worker's nudge about an unmarked day. */
export interface Reminder {
  workerId: string;
  date: string;
  /** ISO timestamp */
  at: string;
}

/** A house the worker works in, as seen from the worker side. */
export interface Engagement {
  id: string;
  houseName: string;
  role: Role;
  roleLabel?: string;
  salary: number;
  tone: AvatarTone;
  initial: string;
}
