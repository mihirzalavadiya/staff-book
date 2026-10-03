"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ensureConfirmedUser } from "../auth/admin";
import { createSupabaseServer, getAuthUser } from "../auth/supabase";
import { db } from "../db";
import { households } from "../db/schema";
import { publicEnv } from "@/lib/env";
import { FLAT_MAX } from "@/lib/home";
import { fail, ok, type ActionResult } from "./result";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendEmailOtp(email: string): Promise<ActionResult> {
  const clean = email.trim().toLowerCase();
  if (!EMAIL.test(clean)) return fail("bad email");
  try {
    await ensureConfirmedUser(clean);
  } catch (err) {
    return fail((err as Error).message);
  }
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: false } });
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

/**
 * The site the user is on right now (localhost, a preview, or production), so
 * OAuth returns them to the same place without depending on an env variable.
 */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return publicEnv.APP_URL;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Returns the Google consent URL; the client navigates to it. */
export async function googleSignInUrl(next = "/today"): Promise<ActionResult<{ url: string }>> {
  const supabase = await createSupabaseServer();
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) return fail(error?.message ?? "no url");
  return ok({ url: data.url });
}

export async function signOut(): Promise<never> {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Onboarding step 1, also used to complete older homes. Idempotent: a second call updates the details. */
export async function createHousehold(input: { name: string; ownerName: string; flat: string; homeLabel?: string }): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return fail("unauthenticated");
  const name = input.name.trim();
  const ownerName = input.ownerName.trim() || name;
  const flat = input.flat.trim().slice(0, FLAT_MAX);
  if (!name) return fail("name");
  if (!flat) return fail("flat");
  await db
    .insert(households)
    .values({ ownerUserId: user.id, name, ownerName, flat, homeLabel: input.homeLabel?.trim() || null })
    .onConflictDoUpdate({
      target: households.ownerUserId,
      set: { name, ownerName, flat, ...(input.homeLabel !== undefined ? { homeLabel: input.homeLabel.trim() || null } : {}) },
    });
  return ok();
}

/** Where a signed-in user should land: onboarding until they have a household. */
export async function postLoginPath(): Promise<string> {
  const user = await getAuthUser();
  if (!user) return "/login";
  const h = await db.query.households.findFirst({ where: eq(households.ownerUserId, user.id) });
  return h ? "/today" : "/onboarding";
}
