import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/server/auth/supabase";

/**
 * Auth landing. Handles both the PKCE `code` from OAuth and the `token_hash`
 * from email links, then continues to `next` (same-origin paths only).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/today";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/today";

  const supabase = await createSupabaseServer();
  let failed = true;
  if (code) {
    failed = Boolean((await supabase.auth.exchangeCodeForSession(code)).error);
  } else if (tokenHash && type) {
    failed = Boolean((await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error);
  }
  return NextResponse.redirect(`${origin}${failed ? "/login?error=auth" : next}`);
}
