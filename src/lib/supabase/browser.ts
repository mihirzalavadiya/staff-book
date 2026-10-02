"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/** Browser auth client (login, logout). Never used for data. */
export function createSupabaseBrowser() {
  return createBrowserClient(publicEnv.SUPABASE_URL, publicEnv.SUPABASE_ANON_KEY);
}
