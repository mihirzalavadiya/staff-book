"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { WorkerHeader } from "@/components/worker/WorkerShell";
import { useWorkerLink } from "@/components/worker/WorkerStore";
import { Icon } from "@/components/ui/Icon";

/** Launch languages in the order the spec lists them, each in its own script. */
const ALL: { code: string; native: string; available: boolean; rtl?: boolean }[] = [
  { code: "hi", native: "हिन्दी", available: true },
  { code: "en", native: "English", available: true },
  { code: "mr", native: "मराठी", available: false },
  { code: "bn", native: "বাংলা", available: false },
  { code: "ta", native: "தமிழ்", available: false },
  { code: "te", native: "తెలుగు", available: false },
  { code: "kn", native: "ಕನ್ನಡ", available: false },
  { code: "gu", native: "ગુજરાતી", available: false },
  { code: "pa", native: "ਪੰਜਾਬੀ", available: false },
  { code: "ur", native: "اردو", available: false, rtl: true },
];

export default function LanguagePage() {
  const { token } = useWorkerLink();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();

  const pick = (code: string) => {
    setLang(code as Lang);
    router.push(`/w/${token}`);
  };

  return (
    <div className="pb-8">
      <WorkerHeader className="pb-[60px]">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-surface">
            <Icon name="globe" size={22} />
          </span>
          <div className="text-[30px] font-extrabold leading-[1.1]">{t("worker.pickLanguage")}</div>
        </div>
      </WorkerHeader>
      <div className="-mt-9 flex flex-col gap-2.5 px-4">
        {ALL.map((l) => {
          const active = l.code === lang;
          return (
            <button
              key={l.code}
              type="button"
              disabled={!l.available}
              onClick={() => pick(l.code)}
              dir={l.rtl ? "rtl" : undefined}
              className={cn(
                "flex h-[72px] items-center justify-between rounded-[24px] px-6 text-[26px] font-extrabold shadow-card",
                active ? "bg-coral text-white" : "bg-surface",
                !l.available && "opacity-45",
              )}
            >
              <span>{l.native}</span>
              {active ? <Icon name="check" size={26} strokeWidth={3} /> : !l.available ? <span className="text-sm font-bold">{t("worker.comingSoon")}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
