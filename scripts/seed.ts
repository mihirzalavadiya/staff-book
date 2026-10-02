/**
 * Demo seed: one household with four workers and a realistic current month.
 *
 *   npm run db:seed                       # priya@staffbook.demo / Priya@1234
 *   SEED_EMAIL=you@example.com SEED_PASSWORD=... npm run db:seed
 *
 * Creates (or reuses) the auth user and sets its password so you can log in
 * straight away. Safe to re-run: it skips if the household exists.
 * SEED_RESET=1 truncates every table first (development only).
 *
 * Worker side needs no login: open /w/sunita-demo-1 (also ramu-demo-2, kamla-demo-3, raju-demo-4).
 */
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";

const email = process.env.SEED_EMAIL ?? "priya@staffbook.demo";
const password = process.env.SEED_PASSWORD ?? "Priya@1234";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
const db = drizzle(sql, { schema, casing: "snake_case" });

const pad = (n: number) => String(n).padStart(2, "0");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const [Y, M, D] = today.split("-").map(Number);
const month = `${Y}-${pad(M)}`;
const day = (d: number) => `${month}-${pad(d)}`;
const at = (d: string, hhmm: string) => new Date(`${d}T${hhmm}:00+05:30`);
const weekday = (d: string) => new Date(`${d}T00:00:00`).getDay();
const prevMonth = (n: number) => {
  const x = new Date(Y, M - 1 - n, 1);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}`;
};

async function ensureUser(): Promise<string> {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password });
    return existing.id;
  }
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created.user) throw error ?? new Error("could not create user");
  return created.user.id;
}

async function main() {
  if (process.env.SEED_RESET === "1") {
    if (process.env.NODE_ENV === "production") throw new Error("Refusing to reset in production.");
    // TRUNCATE bypasses the append-only row trigger on attendance; this is a dev-only reset.
    await sql`TRUNCATE households, workers, engagements, attendance, advances, settlements, reminders, push_subscriptions CASCADE`;
    console.log("Tables truncated.");
  }
  const ownerUserId = await ensureUser();
  const existing = await db.query.households.findFirst({ where: eq(schema.households.ownerUserId, ownerUserId) });
  if (existing) {
    console.log("Household already exists for this user, nothing to do.");
    return;
  }

  const [household] = await db
    .insert(schema.households)
    .values({ ownerUserId, ownerName: "Priya", name: "Priya's home", homeLabel: "Koramangala, Bengaluru" })
    .returning();

  const people = [
    { name: "Sunita", gender: "female", role: "cook", salary: 4000, tone: "purple", days: [1, 2, 3, 4, 5, 6], phone: "+91 98xxx xx210" },
    { name: "Ramu", gender: "male", role: "driver", salary: 12000, tone: "blue", days: [1, 2, 3, 4, 5, 6], phone: "+91 97xxx xx441" },
    { name: "Kamla", gender: "female", role: "maid", salary: 3500, tone: "green", days: [1, 2, 3, 4, 5, 6], phone: "+91 96xxx xx873" },
    { name: "Raju", gender: "male", role: "milk", salary: 1800, tone: "yellow", days: [0, 1, 2, 3, 4, 5, 6], phone: "+91 99xxx xx102" },
  ] as const;

  for (const [i, p] of people.entries()) {
    const [w] = await db.insert(schema.workers).values({ name: p.name, gender: p.gender, phone: p.phone, language: "hi" }).returning();
    const [e] = await db
      .insert(schema.engagements)
      .values({
        householdId: household.id,
        workerId: w.id,
        role: p.role,
        monthlySalary: p.salary,
        workDays: [...p.days],
        tone: p.tone,
        startDate: `${prevMonth(4)}-01`,
        workerToken: `${p.name.toLowerCase()}-demo-${i + 1}`,
      })
      .returning();

    // Current month up to yesterday: mostly present, a couple of leaves, and for
    // the first worker a few unresolved days so the pending flows have data.
    const rows: (typeof schema.attendance.$inferInsert)[] = [];
    for (let d = 1; d < D; d++) {
      const date = day(d);
      if (!(p.days as readonly number[]).includes(weekday(date))) continue;
      const base = { engagementId: e.id, date };
      if (i === 0 && d === D - 3) continue; // nobody marked
      if (i === 0 && d === D - 2) {
        rows.push({ ...base, state: "claim", markedBy: "worker", createdAt: at(date, "07:58") });
        continue;
      }
      if (i === 0 && d === D - 1) {
        rows.push({ ...base, state: "leave", markedBy: "household", createdAt: at(date, "21:05") });
        rows.push({ ...base, state: "dispute", markedBy: "worker", note: "came", voiceSeconds: 14, createdAt: at(date, "21:40") });
        continue;
      }
      if (d === 9 || d === 10) {
        rows.push({ ...base, state: "leave", markedBy: "worker", createdAt: at(date, "06:10") });
        continue;
      }
      rows.push({ ...base, state: "present", markedBy: "household", createdAt: at(date, "07:42") });
    }
    // Today (only if it is a working day): Ramu claimed, Kamla marked present, Sunita and Raju not yet marked.
    const worksToday = (p.days as readonly number[]).includes(weekday(today));
    if (worksToday && i === 1) rows.push({ engagementId: e.id, date: today, state: "claim", markedBy: "worker", createdAt: at(today, "08:05") });
    if (worksToday && i === 2) rows.push({ engagementId: e.id, date: today, state: "present", markedBy: "household", createdAt: at(today, "07:42") });
    if (rows.length) await db.insert(schema.attendance).values(rows);

    if (i === 0) {
      await db.insert(schema.advances).values([
        { engagementId: e.id, amount: 500, date: day(5), note: "Festival" },
        { engagementId: e.id, amount: 1000, date: day(Math.min(18, Math.max(1, D - 1))) },
      ]);
    }
    await db.insert(schema.settlements).values(
      [1, 2, 3].map((n) => ({
        engagementId: e.id,
        month: prevMonth(n),
        workingDays: 26,
        daysPresent: 25,
        daysLeave: 1,
        paidLeaveUsed: 1,
        unpaidDeduction: 0,
        advanceDeducted: 0,
        amountDue: p.salary,
        finalizedAt: new Date(`${prevMonth(n - 1)}-01T10:00:00+05:30`),
        paidAt: n === 1 && i === 3 ? null : new Date(`${prevMonth(n - 1)}-02T10:00:00+05:30`),
      })),
    );
  }

  console.log(`Seeded ${people.length} workers.\nHousehold login: ${email} / ${password}\nWorker link (no login): /w/sunita-demo-1`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
