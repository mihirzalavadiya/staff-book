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
import { fail, ok, RATE_LIMITED, type ActionResult } from "./result";
import { clientIp, hit, isBlocked, LIMITS } from "../rate-limit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Every login request from one network ticks this; it is generous because mobile carriers share addresses. */
async function allowNetwork(): Promise<boolean> {
  const ip = await clientIp();
  return ip ? hit(`login:ip:${ip}`, LIMITS.loginPerIp) : true;
}

/**
 * Password and code checks: only wrong answers count, so someone who signs in
 * often is never locked out, while guessing stops after a few misses.
 */
async function checkGuess(email: string, attempt: () => Promise<{ error: unknown }>): Promise<ActionResult> {
  const key = `login:guess:${email}`;
  if (!(await allowNetwork()) || (await isBlocked(key, LIMITS.guessPerEmail))) return fail(RATE_LIMITED);
  const { error } = await attempt();
  if (!error) return ok();
  await hit(key, LIMITS.guessPerEmail);
  return fail((error as Error).message);
}

export async function sendEmailOtp(email: string): Promise<ActionResult> {
  const clean = email.trim().toLowerCase();
  if (!EMAIL.test(clean)) return fail("bad email");
  // Checked before anything else: each request may create a login and sends an email.
  const [network, inbox] = await Promise.all([allowNetwork(), hit(`login:otp:${clean}`, LIMITS.otpPerEmail)]);
  if (!network || !inbox) return fail(RATE_LIMITED);
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
  const clean = email.trim().toLowerCase();
  const supabase = await createSupabaseServer();
  return checkGuess(clean, () => supabase.auth.signInWithPassword({ email: clean, password }));
}

export async function verifyEmailOtp(email: string, code: string): Promise<ActionResult> {
  const clean = email.trim().toLowerCase();
  const supabase = await createSupabaseServer();
  return checkGuess(clean, () => supabase.auth.verifyOtp({ email: clean, token: code.trim(), type: "email" }));
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
