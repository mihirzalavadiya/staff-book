"use client";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";

export type PushFailureKind = "service" | "blocked";

/**
 * What to explain after a turn-on attempt. Nothing if it worked or the user
 * simply closed the browser's own prompt without choosing.
 */
export function problemAfter(enabled: boolean): PushFailureKind | null {
  if (enabled) return null;
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission === "default") return null;
  return "service";
}

/**
 * The app's own popup for when notifications could not be turned on.
 * "blocked": the site permission is off, so the browser will not ask again.
 * "service": permission was given but the browser could not reach its push
 * service. Same steps for every browser.
 */
export function PushFailureDialog({
  kind,
  onClose,
  onRetry,
  retrying,
}: {
  kind: PushFailureKind | null;
  onClose: () => void;
  onRetry: () => void;
  retrying: boolean;
}) {
  const { t } = useI18n();
  const steps = kind === "blocked" ? ["blockedStep1", "blockedStep2", "blockedStep3"] : ["serviceStep1", "serviceStep2", "serviceStep3"];

  return (
    <Sheet open={kind !== null} onClose={onClose}>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-dispute-bg text-dispute-fg">
          <Icon name="bell" size={30} />
        </span>
        <div className="mt-3 font-display text-[22px] leading-tight tracking-[-0.02em]">
          {t(kind === "blocked" ? "pushUi.blockedTitle" : "pushUi.serviceTitle")}
        </div>
      </div>
      <ol className="mt-4 flex flex-col gap-2">
        {steps.map((k, i) => (
          <li key={k} className="flex items-start gap-3 rounded-[6px] bg-surface-2 px-3.5 py-3 text-sm font-semibold leading-snug">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-coral text-xs font-extrabold text-white">{i + 1}</span>
            {t(`pushUi.${k}`)}
          </li>
        ))}
      </ol>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button size="lg" variant="outline" onClick={onClose}>
          {t("common.close")}
        </Button>
        <Button size="lg" loading={retrying} loadingText={t("pushUi.enabling")} onClick={onRetry}>
          {t("pushUi.retry")}
        </Button>
      </div>
    </Sheet>
  );
}
