import { NextResponse, type NextRequest } from "next/server";
import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/server/db";
import { households, pushSubscriptions } from "@/server/db/schema";
import { env } from "@/server/env";
import { loadHouseholdState } from "@/server/queries/household";
import { sendPush } from "@/server/push/send";
import { dailyEvents } from "@/lib/push-messages";

export const maxDuration = 60;

/**
 * Evening reminder, run by Vercel Cron once a day (see vercel.json). Only
 * households with a device subscribed and something unmarked hear from us.
 * Vercel sends `Authorization: Bearer $CRON_SECRET`. `?dryRun=1` counts what
 * would be sent without sending anything (used by tests).
 */
export async function GET(request: NextRequest) {
  const secret = env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const owners = await db
    .selectDistinct({ householdId: households.id, ownerUserId: households.ownerUserId })
    .from(households)
    .innerJoin(pushSubscriptions, eq(pushSubscriptions.householdId, households.id))
    .where(isNotNull(pushSubscriptions.householdId));

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
  let notified = 0;
  let sent = 0;
  for (const { householdId, ownerUserId } of owners) {
    const state = await loadHouseholdState(ownerUserId);
    if (!state) continue;
    const events = dailyEvents(state);
    if (events.length === 0) continue;
    notified += 1;
    if (dryRun) continue;
    const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.householdId, householdId));
    for (const event of events) sent += await sendPush(subs, event);
  }

  return NextResponse.json({ households: owners.length, notified, sent, dryRun });
}
