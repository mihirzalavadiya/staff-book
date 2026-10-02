# Staffbook

A shared daily attendance register between a household and the people who work in it
(cook, maid, driver, milk). The month-end salary is computed from the register, so it is
never an argument, and over time the register becomes a verified work record for both sides.

Product spec: [`../SPEC.md`](../SPEC.md).

## Stack

- Next.js 16 (App Router, React 19, React Compiler) + TypeScript + Tailwind v4
- Supabase: Postgres + Auth (email code, Google). Data never goes through the Supabase Data API;
  every table has RLS enabled with no policies, and all reads/writes happen on the Next.js server.
- Drizzle ORM (`postgres` driver) with committed SQL migrations
- Vercel for hosting and cron (planned), Web Push via VAPID (planned)

## Layout

```
src/app          routes: (household)/*, w/[token]/* (worker, no login), login, onboarding, auth/callback
src/components   ui primitives, household screens, worker screens
src/lib          shared, pure: ledger rules + settlement math, dates, money, i18n, client store
src/server       backend only (server-only): db schema + client, auth helpers, queries, server actions
src/messages     en.json / hi.json — every string lives here
drizzle/         SQL migrations
scripts/seed.ts  demo data
```

Data flow: a layout loads the ledger on the server → the client store shows it and replays
optimistic actions → each action calls a server action that re-validates ownership, appends to
the ledger and revalidates the route.

## Rules the code enforces

- The app never guesses: an unmarked day is "not marked", never present or absent.
- A worker marking leave is final; a worker marking "came" is a claim until the household confirms.
- Attendance is append-only (a database trigger blocks UPDATE/DELETE); the latest row per day wins.
- Both sides can edit the last 7 days; older days only while the month is unfinalized.
- A month cannot be finalized while any day is unknown, claimed or disputed.

## Setup

```bash
cp .env.example .env.local     # fill in the Supabase values
npm install
npm run db:migrate             # creates tables, RLS, triggers
SEED_EMAIL=you@example.com npm run db:seed   # optional demo data; SEED_RESET=1 wipes first (dev only)
npm run dev
```

Log in at `/login` with the email code. Worker links look like `/w/<token>` and need no login.

Scripts: `dev`, `build`, `lint`, `typecheck`, `db:generate`, `db:migrate`, `db:studio`, `db:seed`.
