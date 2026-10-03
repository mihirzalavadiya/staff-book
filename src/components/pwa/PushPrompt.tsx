"use client";

import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { usePush } from "./usePush";

const DISMISS_KEY = "sb.push.dismissed";
const listeners = new Set<() => void>();
const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Asks once, politely, from a card the user taps; never a cold browser popup.
 * Hidden when push is on, blocked, unsupported, or the card was dismissed.
 */
export function PushPrompt({ target, large }: { target: Parameters<typeof usePush>[0]; large?: boolean }) {
  const { t } = useI18n();
  const { status, busy, turnOn } = usePush(target);
  const dismissed = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    readDismissed,
    () => true,
  );
  const [justEnabled, setJustEnabled] = useState(false);

  if (justEnabled) {
    return (
      <div className="flex items-center gap-3 rounded-[24px] bg-present-bg px-4 py-3.5 font-bold text-present-fg">
        <Icon name="bell" size={20} />
        {t("pushUi.on")}
      </div>
    );
  }
  if (dismissed || status !== "off") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    listeners.forEach((l) => l());
  };

  return (
    <div className={cn("rounded-[24px] bg-av-yellow p-4", large && "p-5")}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-surface">
          <Icon name="bell" size={22} />
        </span>
        <div className="min-w-0 flex-1 leading-snug">
          <div className={cn("font-extrabold", large ? "text-[19px]" : "text-base")}>{t("pushUi.title")}</div>
          <div className={cn("font-semibold text-muted", large ? "text-base" : "text-sm")}>
            {target.kind === "worker" ? t("pushUi.bodyWorker") : t("pushUi.body")}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          size={large ? "xl" : "md"}
          loading={busy}
          loadingText={t("pushUi.enabling")}
          onClick={async () => setJustEnabled(await turnOn())}
        >
          <Icon name="check" size={14} />
          {t("pushUi.allow")}
        </Button>
        <Button size={large ? "xl" : "md"} variant="outline" disabled={busy} onClick={dismiss}>
          {t("pushUi.later")}
        </Button>
      </div>
    </div>
  );
}
