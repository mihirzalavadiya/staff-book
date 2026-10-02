"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { Icon } from "@/components/ui/Icon";

const BTN =
  "flex h-12 flex-none items-center gap-1.5 rounded-3xl border-2 border-ink bg-surface pr-3 pl-2.5 text-[15px] font-bold";

/** Greeting plus the two always-visible controls: colour and language. */
export function WorkerTopRow({ greeting, token, back }: { greeting?: string; token: string; back?: boolean }) {
  const { t } = useI18n();
  const { toggle } = useTheme();
  return (
    <div className="flex items-center gap-2">
      {back ? (
        <Link href={`/w/${token}`} aria-label={t("common.back")} className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-surface">
          <Icon name="chevronLeft" size={22} />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1 text-lg font-semibold leading-tight text-muted">{greeting}</div>
      <button type="button" onClick={toggle} className={BTN}>
        <Icon name="contrast" size={20} />
        {t("worker.theme")}
      </button>
      <Link href={`/w/${token}/language`} className={BTN}>
        <Icon name="globe" size={20} />
        {t("worker.language")}
      </Link>
    </div>
  );
}
