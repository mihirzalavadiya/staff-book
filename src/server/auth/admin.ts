import "server-only";

import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { env } from "../env";
import { publicEnv } from "@/lib/env";

function adminClient() {
  return createClient(publicEnv.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Makes sure an auth user exists for this email and is confirmed. Supabase
 * sends the "Confirm signup" email to new or unconfirmed users and the
 * "Magic Link" email to confirmed ones; confirming first means every login
 * code arrives through one template. Owning the code proves the email anyway.
 */
export async function ensureConfirmedUser(email: string): Promise<void> {
  const rows = await db.execute<{ id: string; confirmed: boolean }>(
    sql`select id, email_confirmed_at is not null as confirmed from auth.users where lower(email) = ${email} limit 1`,
  );
  const existing = rows[0];
  const admin = adminClient();
  if (!existing) {
    const { error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error && error.code !== "email_exists") throw error;
    return;
  }
  if (!existing.confirmed) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, { email_confirm: true });
    if (error) throw error;
  }
}
