import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";

/**
 * Supabase Auth client for Server Components, Server Actions and Route Handlers.
 * Only auth is used here; data goes through Drizzle.
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(publicEnv.SUPABASE_URL, publicEnv.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there and the proxy refreshes them.
        }
      },
    },
  });
}

export async function getAuthUser() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
