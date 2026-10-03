"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { pendingItems } from "@/lib/ledger";
import { homeLabel } from "@/lib/home";
import { useStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Wordmark } from "@/components/household/PageHeader";
import { SavingStatus } from "@/components/ui/SavingStatus";
import { Spinner } from "@/components/ui/Spinner";
import { signOut } from "@/server/actions/auth";
import { useTransition } from "react";

interface NavItem {
  href: string;
  key: string;
  icon: IconName;
}

const TABS: NavItem[] = [
  { href: "/today", key: "nav.today", icon: "sun" },
  { href: "/calendar", key: "nav.calendar", icon: "calendar" },
  { href: "/hisaab", key: "nav.hisaab", icon: "ledger" },
  { href: "/workers", key: "nav.workers", icon: "users" },
];

function useActive(href: string): boolean {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarItem({ item, badge }: { item: NavItem; badge?: number }) {
  const active = useActive(item.href);
  const { t } = useI18n();
  return (
    <Link
      href={item.href}
      className={cn(
        "flex h-11 items-center gap-3",
        active ? "border-b border-ink font-bold text-ink" : "font-medium text-muted",
      )}
    >
      <Icon name={item.icon} size={18} />
      <span className="flex-1">{t(item.key)}</span>
      {badge ? <span className="text-[11px] font-bold text-coral tabular">{String(badge).padStart(2, "0")}</span> : null}
    </Link>
  );
}

function Sidebar() {
  const { t } = useI18n();
  const { state } = useStore();
  const { toggle } = useTheme();
  const pending = pendingItems(state).length;

  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] flex-none flex-col border-r border-line px-[22px] py-[30px] text-sm lg:flex">
      <Link href="/today">
        <Wordmark className="block text-[28px] leading-none" />
        <div className="label-caps mt-2 truncate text-[9.5px]">{homeLabel(state.household.name, state.household.flat)}</div>
      </Link>
      <nav className="mt-10 flex flex-col">
        {TABS.map((item) => (
          <SidebarItem key={item.href} item={item} />
        ))}
        <SidebarItem item={{ href: "/inbox", key: "nav.inbox", icon: "tray" }} badge={pending} />
      </nav>
      <div className="flex-1" />
      <div className="mb-[18px] flex flex-col gap-0.5 text-muted">
        <button type="button" onClick={toggle} className="flex h-[38px] items-center gap-3">
          <Icon name="contrast" size={18} />
          {t("nav.theme")}
        </button>
        <Link href="/settings" className="flex h-[38px] items-center gap-3">
          <Icon name="settings" size={18} />
          {t("nav.settings")}
        </Link>
        <LogoutItem />
      </div>
      <Link
        href="/workers/new"
        className="flex h-11 items-center justify-center gap-2 rounded-[3px] border border-ink font-semibold tracking-[0.02em]"
      >
        <Icon name="plus" size={15} />
        {t("nav.addWorker")}
      </Link>
    </aside>
  );
}

function LogoutItem() {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => signOut())}
      disabled={pending}
      className="flex h-[38px] items-center gap-3 disabled:cursor-progress"
    >
      {pending ? <Spinner size={18} /> : <Icon name="logout" size={18} />}
      {pending ? t("settings.loggingOut") : t("nav.logout")}
    </button>
  );
}

function TabItem({ item }: { item: NavItem }) {
  const active = useActive(item.href);
  const { t } = useI18n();
  return (
    <Link
      href={item.href}
      className={cn("flex flex-col items-center justify-center gap-[5px]", active ? "text-ink" : "text-nav-idle")}
    >
      <Icon name={item.icon} size={21} />
      <span className={cn("text-[9.5px] tracking-[0.16em] uppercase", active ? "font-bold" : "font-semibold")}>
        {t(item.key)}
      </span>
      <span className={cn("h-1 w-1 rounded-full", active ? "bg-coral" : "bg-transparent")} />
    </Link>
  );
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[82px] grid-cols-4 border-t border-line bg-bg px-2 pt-2.5 pb-[18px] lg:hidden">
      {TABS.map((item) => (
        <TabItem key={item.href} item={item} />
      ))}
    </nav>
  );
}

/**
 * Household chrome. Phone and tablet: single column with the bottom tab bar
 * (tablet is centred at 600px). Desktop: left sidebar and a wide content area.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg lg:flex">
      <Sidebar />
      <div className="mx-auto w-full max-w-[600px] pb-[104px] lg:mx-0 lg:max-w-none lg:flex-1 lg:min-w-0 lg:pb-0">
        {children}
      </div>
      <BottomNav />
      <SavingStatus />
    </div>
  );
}
