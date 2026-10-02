"use client";

import { useI18n } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/lib/theme";
import Link from "next/link";
import { pendingItems } from "@/lib/ledger";
import { useStore } from "@/lib/store";

/**
 * Peach header block. Phone: full-bleed with a rounded bottom that the content overlaps.
 * Tablet and desktop: a rounded card.
 */
export const HEADER_CLASS =
  "flex flex-col rounded-b-[38px] bg-peach px-4 pt-[18px] sm:mt-4 sm:rounded-[30px] lg:mt-0 lg:px-6 lg:py-[22px]";

/** Round translucent icon button used on the peach header. */
export function HeaderIconButton({
  icon,
  onClick,
  href,
  badge,
  label,
}: {
  icon: "contrast" | "bell" | "settings" | "chevronLeft";
  onClick?: () => void;
  href?: string;
  badge?: number;
  label: string;
}) {
  const inner = (
    <>
      <Icon name={icon} size={19} />
      {badge ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-peach bg-coral px-1 text-[10px] font-bold leading-none text-white">
          {badge}
        </span>
      ) : null}
    </>
  );
  const cls = "relative flex h-11 w-11 items-center justify-center rounded-full bg-glass text-ink";
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/** Logo + theme + inbox row shown at the top of the phone header block. */
export function MobileTopRow({ title }: { title?: string }) {
  const { t } = useI18n();
  const { toggle } = useTheme();
  const { state } = useStore();
  const pending = pendingItems(state).length;
  return (
    <div className="flex items-center gap-2.5 lg:hidden">
      <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-coral font-display text-xl font-extrabold text-white">
        S
      </div>
      <div className="flex-1 font-display text-xl font-extrabold tracking-[-0.03em]">{title ?? t("app.name")}</div>
      <HeaderIconButton icon="contrast" onClick={toggle} label={t("nav.theme")} />
      <HeaderIconButton icon="bell" href="/inbox" badge={pending} label={t("nav.inbox")} />
      <HeaderIconButton icon="settings" href="/settings" label={t("nav.settings")} />
    </div>
  );
}
