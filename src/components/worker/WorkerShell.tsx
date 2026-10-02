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
    <div className="min-h-dvh bg-bg sm:bg-peach/60">
      <div
        className={cn(
          "relative mx-auto min-h-dvh w-full max-w-[480px] bg-bg text-[19px] sm:shadow-float",
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
    <header className={cn("rounded-b-[38px] bg-peach px-4 pt-5 pb-[70px]", className)}>{children}</header>
  );
}
