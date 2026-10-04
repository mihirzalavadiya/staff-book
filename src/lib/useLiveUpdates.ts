"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "./env";
import { LIVE_EVENT } from "./live";

/** Coming back after this long reloads once, in case a bell was missed while away. */
const STALE_AFTER_MS = 30_000;
/** Several saves in a burst cause one reload. */
const DEBOUNCE_MS = 400;

let client: SupabaseClient | null = null;
function realtime(): SupabaseClient {
  // Only the realtime socket is used; the login session stays with the server cookies.
  client ??= createClient(publicEnv.SUPABASE_URL, publicEnv.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "sb-live" },
  });
  return client;
}

/**
 * Keeps this screen in step with the server: reloads when someone else saves
 * something it shows, when the connection comes back, and when the app returns
 * to the foreground after a while. A save in progress keeps its frozen view,
 * so a reload never yanks a button away mid-tap.
 */
export function useLiveUpdates(topics: string[]) {
  const router = useRouter();
  const key = topics.join("|");

  useEffect(() => {
    const names = key ? key.split("|") : [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reload = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), DEBOUNCE_MS);
    };

    const sb = realtime();
    const channels = names.map((name) => {
      let joined = false;
      return sb
        .channel(name)
        .on("broadcast", { event: LIVE_EVENT }, reload)
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          // A re-join means we were disconnected and may have missed a bell.
          if (joined) reload();
          joined = true;
        });
    });

    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > STALE_AFTER_MS) reload();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const ch of channels) void sb.removeChannel(ch);
    };
  }, [key, router]);
}
