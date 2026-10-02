/**
 * Throwaway test data: one household with named workers, created fresh for a
 * test run and purged afterwards, so the demo data is never touched.
 *
 * Every worker works all seven days and started on the 1st of the current
 * month, with every past day already marked present. Today is left unmarked,
 * which makes the tests independent of what weekday they run on.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, inArray } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../../src/server/db/schema";

export interface FixtureWorker {
  key: string;
  name: string;
  gender: "female" | "male";
  engagementId: string;
  token: string;
  salary: number;
}

export interface Fixture {
  householdId: string;
  ownerUserId: string;
  email: string;
  password: string;
  today: string;
  workers: Record<string, FixtureWorker>;
}

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export const WORKERS = [
  { key: "claim", name: "Gopal", gender: "male", role: "driver", salary: 9000 },
  { key: "reject", name: "Kiran", gender: "female", role: "maid", salary: 3200 },
  { key: "dispute", name: "Lata", gender: "female", role: "maid", salary: 3000 },
  { key: "remind", name: "Meena", gender: "female", role: "cook", salary: 4000 },
  { key: "settle", name: "Ravi", gender: "male", role: "milk", salary: 3000 },
  { key: "hindi", name: "Suresh", gender: "male", role: "driver", salary: 8000 },
  // Started last month; last month is fully marked except the 10th, which is far outside the 7-day window.
  { key: "older", name: "Pooja", gender: "female", role: "cook", salary: 3100 },
] as const;

/** YYYY-MM of the month before `today`. */
export function previousMonth(today: string): string {
  const [y, m] = today.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const OLDER_GAP_DAY = 10;

export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

function connect() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  return { sql, db: drizzle(sql, { schema, casing: "snake_case" }) };
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * @param withAuthUser create a real Supabase login (needed by browser tests).
 *   Integration tests skip it and use a random owner id.
 */
export async function createFixture({ withAuthUser }: { withAuthUser: boolean }): Promise<Fixture> {
  const run = randomBytes(4).toString("hex");
  const email = `e2e-${run}@staffbook.test`;
  const password = `E2e!${randomBytes(6).toString("hex")}`;
  let ownerUserId: string = randomUUID();

  if (withAuthUser) {
    const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("could not create test user");
    ownerUserId = data.user.id;
  }

  const { sql, db } = connect();
  try {
    const today = todayIST();
    const monthStart = `${today.slice(0, 7)}-01`;
    const pastDays: string[] = [];
    for (let d = 1; ; d++) {
      const iso = `${today.slice(0, 7)}-${String(d).padStart(2, "0")}`;
      if (iso >= today) break;
      pastDays.push(iso);
    }

    const [household] = await db
      .insert(schema.households)
      .values({ ownerUserId, ownerName: "Asha", name: `E2E Home ${run}` })
      .returning();

    const workers: Record<string, FixtureWorker> = {};
    for (const w of WORKERS) {
      const [row] = await db.insert(schema.workers).values({ name: w.name, gender: w.gender, language: "hi" }).returning();
      const token = `e2e-${w.key}-${run}`;
      const prev = previousMonth(today);
      const prevDays: string[] = [];
      if (w.key === "older") {
        const last = new Date(Number(prev.slice(0, 4)), Number(prev.slice(5, 7)), 0).getDate();
        for (let d = 1; d <= last; d++) if (d !== OLDER_GAP_DAY) prevDays.push(`${prev}-${String(d).padStart(2, "0")}`);
      }
      const [e] = await db
        .insert(schema.engagements)
        .values({
          householdId: household.id,
          workerId: row.id,
          role: w.role,
          monthlySalary: w.salary,
          workDays: ALL_DAYS,
          startDate: w.key === "older" ? `${prev}-01` : monthStart,
          workerToken: token,
        })
        .returning();
      const toFill = [...prevDays, ...pastDays];
      if (toFill.length) {
        await db
          .insert(schema.attendance)
          .values(toFill.map((date) => ({ engagementId: e.id, date, state: "present" as const, markedBy: "household" as const })));
      }
      workers[w.key] = { key: w.key, name: w.name, gender: w.gender, engagementId: e.id, token, salary: w.salary };
    }

    return { householdId: household.id, ownerUserId, email, password, today, workers };
  } finally {
    await sql.end();
  }
}

/** Deletes everything the fixture created, using the trigger's test-only purge switch. */
export async function destroyFixture(f: Pick<Fixture, "householdId" | "ownerUserId">, { withAuthUser }: { withAuthUser: boolean }) {
  const { sql, db } = connect();
  try {
    await db.transaction(async (tx) => {
      await tx.execute("SET LOCAL staffbook.allow_purge = 'on'");
      const engs = await tx.select().from(schema.engagements).where(eq(schema.engagements.householdId, f.householdId));
      const ids = engs.map((e) => e.id);
      if (ids.length) {
        await tx.delete(schema.reminders).where(inArray(schema.reminders.engagementId, ids));
        await tx.delete(schema.pushSubscriptions).where(inArray(schema.pushSubscriptions.engagementId, ids));
        await tx.delete(schema.attendance).where(inArray(schema.attendance.engagementId, ids));
        await tx.delete(schema.advances).where(inArray(schema.advances.engagementId, ids));
        await tx.delete(schema.settlements).where(inArray(schema.settlements.engagementId, ids));
        await tx.delete(schema.engagements).where(inArray(schema.engagements.id, ids));
        await tx.delete(schema.workers).where(inArray(schema.workers.id, engs.map((e) => e.workerId)));
      }
      await tx.delete(schema.households).where(eq(schema.households.id, f.householdId));
    });
  } finally {
    await sql.end();
  }
  if (withAuthUser) await admin().auth.admin.deleteUser(f.ownerUserId);
}

/** Raw rows for one engagement and day, oldest first. Used to assert what was persisted. */
export async function attendanceRows(engagementId: string, date: string) {
  const { sql, db } = connect();
  try {
    const rows = await db.query.attendance.findMany({
      where: (a, { and, eq: e }) => and(e(a.engagementId, engagementId), e(a.date, date)),
      orderBy: (a, { asc }) => [asc(a.createdAt)],
    });
    return rows.map((r) => ({ state: r.state, markedBy: r.markedBy }));
  } finally {
    await sql.end();
  }
}
