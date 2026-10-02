"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createSupabaseServer, getAuthUser } from "../auth/supabase";
import { db } from "../db";
import { households } from "../db/schema";
import { publicEnv } from "@/lib/env";
import { fail, ok, type ActionResult } from "./result";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendEmailOtp(email: string): Promise<ActionResult> {
  const clean = email.trim().toLowerCase();
  if (!EMAIL.test(clean)) return fail("bad email");
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
  return error ? fail(error.message) : ok();
}

export async function signInWithPassword(email: string, password: string): Promise<ActionResult> {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  return error ? fail(error.message) : ok();
}

export async function verifyEmailOtp(email: string, code: string): Promise<ActionResult> {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
  return error ? fail(error.message) : ok();
}

/** Returns the Google consent URL; the client navigates to it. */
export async function googleSignInUrl(next = "/today"): Promise<ActionResult<{ url: string }>> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${publicEnv.APP_URL}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) return fail(error?.message ?? "no url");
  return ok({ url: data.url });
}

export async function signOut(): Promise<never> {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Onboarding step 1. Idempotent: a second call just updates the name. */
export async function createHousehold(input: { name: string; ownerName: string; homeLabel?: string }): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return fail("unauthenticated");
  const name = input.name.trim();
  const ownerName = input.ownerName.trim() || name;
  if (!name) return fail("name");
  await db
    .insert(households)
    .values({ ownerUserId: user.id, name, ownerName, homeLabel: input.homeLabel?.trim() || null })
    .onConflictDoUpdate({ target: households.ownerUserId, set: { name, ownerName } });
  return ok();
}

/** Where a signed-in user should land: onboarding until they have a household. */
export async function postLoginPath(): Promise<string> {
  const user = await getAuthUser();
  if (!user) return "/login";
  const h = await db.query.households.findFirst({ where: eq(households.ownerUserId, user.id) });
  return h ? "/today" : "/onboarding";
}
