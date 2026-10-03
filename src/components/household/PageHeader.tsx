"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { pendingItems } from "@/lib/ledger";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { Icon } from "@/components/ui/Icon";

/** Sand header band. Phone: full-bleed, the page sheet overlaps its bottom. Desktop: a band across the content. */
export const HEADER_CLASS = "flex flex-col bg-peach px-[22px] pt-5 lg:px-10 lg:pt-8 lg:pb-[26px]";

/** The ivory sheet that rides up over the header on phones. Pair with a negative top margin. */
export const SHEET_CLASS =
  "relative mx-3.5 rounded-t-[22px] bg-bg px-[18px] pt-5 lg:mx-0 lg:mt-0 lg:rounded-none lg:px-10 lg:pt-[26px]";

/** "Staffbook" set in the serif with an italic "book". */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display tracking-[-0.01em]", className)}>
      Staff<i>book</i>
    </span>
  );
}

/** Round hairline icon button used on the sand header. */
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
      <Icon name={icon} size={18} />
      {badge ? (
        <span className="absolute -top-[3px] -right-[3px] h-[17px] min-w-[17px] rounded-[9px] bg-coral px-1 text-center text-[10px] leading-[17px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </>
  );
  const cls = "relative flex h-10 w-10 flex-none items-center justify-center rounded-full border border-muted-2 text-ink";
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

/** Wordmark + theme + inbox + settings row at the top of the phone header, with an optional page title under it. */
export function MobileTopRow({ title }: { title?: string }) {
  const { t } = useI18n();
  const { toggle } = useTheme();
  const { state } = useStore();
  const pending = pendingItems(state).length;
  return (
    <div className="lg:hidden">
      <div className="flex items-center gap-2.5">
        <Link href="/today" className="flex-1">
          <Wordmark className="text-[22px]" />
        </Link>
        <HeaderIconButton icon="contrast" onClick={toggle} label={t("nav.theme")} />
        <HeaderIconButton icon="bell" href="/inbox" badge={pending} label={t("nav.inbox")} />
        <HeaderIconButton icon="settings" href="/settings" label={t("nav.settings")} />
      </div>
      {title && <h1 className="mt-[26px] font-display text-[40px] leading-none tracking-[-0.03em]">{title}</h1>}
    </div>
  );
}

/** Page title for desktop, where the phone's top row is hidden. */
export function DesktopTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="hidden font-display text-[52px] leading-none tracking-[-0.035em] lg:block">{children}</h1>;
}
