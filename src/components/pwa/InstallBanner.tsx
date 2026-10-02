"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "sb.install.dismissed";

/**
 * Install state lives outside React: the browser's install prompt event fires
 * once, often before mount, and "installed"/"dismissed" are external facts.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", notify);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getVisible = () => !isStandalone() && !isDismissed();
const getVisibleServer = () => false;

/**
 * "Add to home screen" for the worker side. Where the browser offers a native
 * install prompt we use it; otherwise we show the two manual steps, worded the
 * same for every phone and desktop browser. Hidden once installed or dismissed.
 */
export function InstallBanner() {
  const { t } = useI18n();
  const visible = useSyncExternalStore(subscribe, getVisible, getVisibleServer);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    notify();
  };

  const install = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === "accepted") dismiss();
      return;
    }
    // No native prompt on this browser (or not on https yet): show the manual steps.
    setShowSteps(true);
  };

  return (
    <>
      <div className="flex items-center gap-3 rounded-[24px] bg-av-purple px-4 py-3.5">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-surface">
          <Icon name="home" size={22} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[17px] font-extrabold">{t("worker.installTitle")}</div>
          <div className="text-sm font-semibold text-muted">{t("worker.installBody")}</div>
        </div>
        <button type="button" onClick={dismiss} aria-label={t("common.close")} className="flex h-9 w-9 items-center justify-center rounded-full text-muted">
          <Icon name="x" size={14} />
        </button>
        <button type="button" onClick={install} className="h-10 rounded-full bg-ink px-4 text-sm font-extrabold text-surface">
          {t("worker.install")}
        </button>
      </div>
      <Sheet open={showSteps} onClose={() => setShowSteps(false)} title={t("worker.installTitle")}>
        <ol className="flex flex-col gap-3 text-lg font-semibold">
          <li className="flex items-center gap-3 rounded-[20px] bg-surface-2 px-4 py-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-coral font-display text-white">1</span>
            {t("worker.installStep1")}
          </li>
          <li className="flex items-center gap-3 rounded-[20px] bg-surface-2 px-4 py-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-coral font-display text-white">2</span>
            {t("worker.installStep2")}
          </li>
        </ol>
      </Sheet>
    </>
  );
}
