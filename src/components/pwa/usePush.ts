"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { disablePush, enablePush, pushStatus, type PushStatus } from "@/lib/push/client";
import { subscribeHousehold, subscribeWorker, unsubscribe } from "@/server/actions/push";

/** This device's push state, plus on/off for the household or for a worker's link. */
export function usePush(target: { kind: "household" } | { kind: "worker"; token: string }) {
  const { lang } = useI18n();
  const [status, setStatus] = useState<PushStatus | "loading">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    pushStatus()
      .then((s) => alive && setStatus(s))
      .catch(() => alive && setStatus("unsupported"));
    return () => {
      alive = false;
    };
  }, []);

  const token = target.kind === "worker" ? target.token : null;

  const turnOn = useCallback(async () => {
    setBusy(true);
    try {
      const subscription = await enablePush();
      if (!subscription) {
        setStatus(await pushStatus());
        return false;
      }
      const result = token
        ? await subscribeWorker({ token, subscription, language: lang })
        : await subscribeHousehold({ subscription, language: lang });
      setStatus(result.ok ? "on" : "off");
      return result.ok;
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
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, turnOn, turnOff };
}
