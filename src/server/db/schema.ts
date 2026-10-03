import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Staffbook schema. Attendance is append-only: rows are inserted, never
 * updated or deleted, and the latest row per (engagement, date) wins.
 */

export const roleEnum = pgEnum("role", ["cook", "maid", "driver", "milk", "other"]);
export const langEnum = pgEnum("lang", ["en", "hi"]);
export const genderEnum = pgEnum("gender", ["female", "male"]);
export const toneEnum = pgEnum("avatar_tone", ["purple", "blue", "green", "yellow", "peach"]);
export const engagementStatusEnum = pgEnum("engagement_status", ["active", "archived"]);
export const attendanceStateEnum = pgEnum("attendance_state", ["present", "leave", "claim", "dispute"]);
export const sideEnum = pgEnum("side", ["household", "worker", "system"]);
export const disputeResolutionEnum = pgEnum("dispute_resolution", ["present", "leave"]);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const households = pgTable("households", {
  id: id(),
  /** Supabase auth.users.id of the owner. */
  ownerUserId: uuid("owner_user_id").notNull().unique(),
  ownerName: text("owner_name").notNull(),
  name: text("name").notNull(),
  homeLabel: text("home_label"),
  lat: text("lat"),
  lng: text("lng"),
  geofenceM: integer("geofence_m").notNull().default(150),
  notifyAt: time("notify_at").notNull().default("20:00"),
  language: langEnum("language").notNull().default("en"),
  createdAt: createdAt(),
});

export const workers = pgTable("workers", {
  id: id(),
  name: text("name").notNull(),
  /** Drives grammatical gender in Hindi and pronouns in English. */
  gender: genderEnum("gender").notNull().default("female"),
  phone: text("phone"),
  language: langEnum("language").notNull().default("hi"),
  createdAt: createdAt(),
});

export const engagements = pgTable(
  "engagements",
  {
    id: id(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "restrict" }),
    workerId: uuid("worker_id")
      .notNull()
      .references(() => workers.id, { onDelete: "restrict" }),
    role: roleEnum("role").notNull(),
    /** What the work is when role = "other", e.g. "Gardener". Shown instead of the role. */
    roleLabel: text("role_label"),
    monthlySalary: integer("monthly_salary").notNull(),
    /** Weekdays worked, 0 = Sunday … 6 = Saturday. */
    workDays: smallint("work_days").array().notNull().default(sql`'{1,2,3,4,5,6}'::smallint[]`),
    paidLeavesPerMonth: smallint("paid_leaves_per_month").notNull().default(2),
    tone: toneEnum("tone").notNull().default("purple"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    /** Secret link token. This is the worker's identity; never expose it to other households. */
    workerToken: text("worker_token").notNull().unique(),
    status: engagementStatusEnum("status").notNull().default("active"),
    createdAt: createdAt(),
  },
  (t) => [index("engagements_household_idx").on(t.householdId), index("engagements_worker_idx").on(t.workerId)],
);

export const attendance = pgTable(
  "attendance",
  {
    id: id(),
    engagementId: uuid("engagement_id")
      .notNull()
      .references(() => engagements.id, { onDelete: "restrict" }),
    date: date("date").notNull(),
    state: attendanceStateEnum("state").notNull(),
    markedBy: sideEnum("marked_by").notNull(),
    note: text("note"),
    voiceSeconds: smallint("voice_seconds"),
    voicePath: text("voice_path"),
    createdAt: createdAt(),
  },
  (t) => [index("attendance_engagement_date_idx").on(t.engagementId, t.date, t.createdAt)],
);

export const advances = pgTable(
  "advances",
  {
    id: id(),
    engagementId: uuid("engagement_id")
      .notNull()
      .references(() => engagements.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    date: date("date").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("advances_engagement_idx").on(t.engagementId, t.date)],
);

export const settlements = pgTable(
  "settlements",
  {
    id: id(),
    engagementId: uuid("engagement_id")
      .notNull()
      .references(() => engagements.id, { onDelete: "restrict" }),
    /** YYYY-MM */
    month: text("month").notNull(),
    workingDays: smallint("working_days").notNull(),
    daysPresent: smallint("days_present").notNull(),
    daysLeave: smallint("days_leave").notNull(),
    paidLeaveUsed: smallint("paid_leave_used").notNull(),
    unpaidDeduction: integer("unpaid_deduction").notNull(),
    advanceDeducted: integer("advance_deducted").notNull(),
    amountDue: integer("amount_due").notNull(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }).notNull().defaultNow(),
    finalizedBy: sideEnum("finalized_by").notNull().default("household"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("settlements_engagement_month_uq").on(t.engagementId, t.month)],
);

/** "Remind them": a worker nudging the household about an unmarked day. One row per day, latest wins. */
export const reminders = pgTable(
  "reminders",
  {
    id: id(),
    engagementId: uuid("engagement_id")
      .notNull()
      .references(() => engagements.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("reminders_engagement_date_uq").on(t.engagementId, t.date)],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: id(),
    householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }),
    engagementId: uuid("engagement_id").references(() => engagements.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    /** Language the device was using when it subscribed; notifications are written in it. */
    language: langEnum("language").notNull().default("en"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("push_household_idx").on(t.householdId), index("push_engagement_idx").on(t.engagementId)],
);

export const householdsRelations = relations(households, ({ many }) => ({
  engagements: many(engagements),
}));

export const workersRelations = relations(workers, ({ many }) => ({
  engagements: many(engagements),
}));

export const engagementsRelations = relations(engagements, ({ one, many }) => ({
  household: one(households, { fields: [engagements.householdId], references: [households.id] }),
  worker: one(workers, { fields: [engagements.workerId], references: [workers.id] }),
  attendance: many(attendance),
  advances: many(advances),
  settlements: many(settlements),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  engagement: one(engagements, { fields: [attendance.engagementId], references: [engagements.id] }),
}));

export const advancesRelations = relations(advances, ({ one }) => ({
  engagement: one(engagements, { fields: [advances.engagementId], references: [engagements.id] }),
}));

export const settlementsRelations = relations(settlements, ({ one }) => ({
  engagement: one(engagements, { fields: [settlements.engagementId], references: [engagements.id] }),
}));

export type HouseholdRow = typeof households.$inferSelect;
export type WorkerRow = typeof workers.$inferSelect;
export type EngagementRow = typeof engagements.$inferSelect;
export type AttendanceRow = typeof attendance.$inferSelect;
export type AdvanceRow = typeof advances.$inferSelect;
export type SettlementRow = typeof settlements.$inferSelect;
export type ReminderRow = typeof reminders.$inferSelect;
