"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { disablePush, enablePush, pushStatus, type PushStatus } from "@/lib/push/client";
import { subscribeHousehold, subscribeWorker, unsubscribe } from "@/server/actions/push";

/** This device's push state, plus on/off for the household or for a worker's link. */
export function usePush(target: { kind: "household" } | { kind: "worker"; token: string }) {
  const { lang } = useI18n();
  const [status, setStatus] = useState<PushStatus | "loading">("loading");
  /** What the browser itself has decided for this site: "granted", "denied" or "default" (not asked yet). */
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [busy, setBusy] = useState(false);
  /** Set when the browser refused to create a subscription (e.g. its push service is turned off). */
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    pushStatus()
      .then((s) => {
        if (!alive) return;
        setStatus(s);
        if ("Notification" in window) setPermission(Notification.permission);
      })
      .catch(() => alive && setStatus("unsupported"));
    return () => {
      alive = false;
    };
  }, []);

  const token = target.kind === "worker" ? target.token : null;

  const turnOn = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    try {
      const subscription = await enablePush();
      if ("Notification" in window) setPermission(Notification.permission);
      if (!subscription) {
        setStatus(await pushStatus());
        return false;
      }
      const result = token
        ? await subscribeWorker({ token, subscription, language: lang })
        : await subscribeHousehold({ subscription, language: lang });
      setStatus(result.ok ? "on" : "off");
      if (!result.ok) setFailed(true);
      return result.ok;
    } catch {
      // Browser-side refusal, e.g. "Registration failed - push service error".
      setFailed(true);
      setStatus(await pushStatus().catch(() => "unsupported" as const));
      return false;
    } finally {
      setBusy(false);
    }
  }, [lang, token]);

  const turnOff = useCallback(async () => {
    setBusy(true);
    try {
      const endpoint = await disablePush();
      if (endpoint) await unsubscribe({ endpoint });
      setStatus("off");
    } catch {
      setStatus(await pushStatus().catch(() => "unsupported" as const));
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, failed, permission, turnOn, turnOff };
}
