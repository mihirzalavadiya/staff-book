"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";

/** Shown when a save was rejected or the network failed. Loaders live on the buttons themselves. */
export function SavingStatus() {
  const { t } = useI18n();
  const { error, clearError } = useStore();

  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(clearError, 6000);
    return () => window.clearTimeout(id);
  }, [error, clearError]);

  return (
    <>
      {error && (
        <div role="alert" className="fixed inset-x-4 bottom-[104px] z-[60] mx-auto flex max-w-[440px] items-center gap-3 rounded-[20px] bg-dispute-bg px-4 py-3 text-sm font-bold text-dispute-fg shadow-float lg:bottom-6">
          <Icon name="warning" size={18} className="flex-none" />
          <span className="flex-1">{t("common.saveFailed")}</span>
          <button type="button" onClick={clearError} className="rounded-full bg-surface px-3 py-1.5 text-xs font-extrabold text-dispute-fg">
            {t("common.dismiss")}
          </button>
        </div>
      )}
    </>
  );
}
