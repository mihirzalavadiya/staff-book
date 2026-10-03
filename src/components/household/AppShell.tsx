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
import { Avatar } from "@/components/ui/Avatar";
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
        "flex h-[46px] items-center gap-3 rounded-[15px] px-3.5",
        active ? "bg-coral-soft font-extrabold text-coral" : "font-semibold text-muted",
      )}
    >
      <Icon name={item.icon} size={19} />
      <span className="flex-1">{t(item.key)}</span>
      {badge ? (
        <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-[11px] bg-coral px-1 text-[11px] font-extrabold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function Sidebar() {
  const { t } = useI18n();
  const { state } = useStore();
  const { toggle } = useTheme();
  const pending = pendingItems(state).length;
  const active = state.workers.filter((w) => !w.endDate).length;

  return (
    <aside className="hidden h-dvh w-60 flex-none flex-col gap-1 border-r border-line bg-surface px-3.5 py-[22px] lg:flex sticky top-0">
      <Link href="/today" className="flex items-center gap-2.5 px-1.5 pb-[22px]">
        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-coral font-display text-xl font-extrabold text-white">
          S
        </div>
        <div className="font-display text-[22px] font-extrabold tracking-[-0.03em]">{t("app.name")}</div>
      </Link>
      {TABS.map((item) => (
        <SidebarItem key={item.href} item={item} />
      ))}
      <SidebarItem item={{ href: "/inbox", key: "nav.inbox", icon: "tray" }} badge={pending} />
      <div className="flex-1" />
      <button
        type="button"
        onClick={toggle}
        className="flex h-11 items-center gap-3 rounded-[15px] px-3.5 font-semibold text-muted"
      >
        <Icon name="contrast" size={19} />
        {t("nav.theme")}
      </button>
      <Link href="/settings" className="flex h-11 items-center gap-3 rounded-[15px] px-3.5 font-semibold text-muted">
        <Icon name="settings" size={19} />
        {t("nav.settings")}
      </Link>
      <LogoutItem />
      <Link
        href="/workers/new"
        className="flex h-[46px] items-center justify-center gap-2 rounded-2xl bg-coral text-[15px] font-bold text-white"
      >
        <Icon name="plus" size={16} />
        {t("nav.addWorker")}
      </Link>
      <Link href="/settings" className="mt-3 flex items-center gap-2.5 rounded-[20px] bg-peach p-3">
        <Avatar initial={state.household.ownerName[0]} tone="peach" size={38} shape="circle" className="bg-surface" />
        <div className="leading-tight">
          <div className="font-extrabold">{homeLabel(state.household.name, state.household.flat)}</div>
          <div className="text-xs text-muted">{t("nav.workersCount", { count: active })}</div>
        </div>
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
      className="mb-2 flex h-11 items-center gap-3 rounded-[15px] px-3.5 font-semibold text-muted disabled:cursor-progress"
    >
      {pending ? <Spinner size={19} /> : <Icon name="logout" size={19} />}
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
      className={cn(
        "flex flex-col items-center justify-center gap-[3px] text-[11px]",
        active ? "font-extrabold text-coral" : "font-semibold text-nav-idle",
      )}
    >
      <span className={cn("flex h-8 w-14 items-center justify-center rounded-2xl", active && "bg-coral-soft")}>
        <Icon name={item.icon} size={22} />
      </span>
      {t(item.key)}
    </Link>
  );
}

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[84px] grid-cols-4 rounded-t-[28px] bg-surface px-2 pt-2 pb-4 shadow-nav lg:hidden">
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
      <div className="mx-auto w-full max-w-[600px] pb-[110px] lg:mx-0 lg:max-w-none lg:flex-1 lg:min-w-0 lg:pb-0">
        {children}
      </div>
      <BottomNav />
      <SavingStatus />
    </div>
  );
}
