"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { SavingStatus } from "@/components/ui/SavingStatus";

/**
 * Worker chrome: a single phone-width column at every viewport.
 * Workers are on phones; on a laptop the column just sits centred on a warm backdrop.
 */
export function WorkerShell({ children }: { children: React.ReactNode }) {
  const { lang } = useI18n();
  return (
    <div className="min-h-dvh bg-bg sm:bg-surface-2">
      <div
        className={cn(
          "relative mx-auto min-h-dvh w-full max-w-[480px] bg-bg text-[19px] sm:border-x sm:border-line",
          lang === "hi" ? "font-deva" : "font-sans",
        )}
      >
        {children}
      </div>
      <SavingStatus />
    </div>
  );
}

export function WorkerHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("bg-peach px-5 pt-5 pb-[74px]", className)}>{children}</header>
  );
}
