"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { usePhase } from "@/lib/usePhase";
import { createHousehold } from "@/server/actions/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";

/** Three steps, under a minute: your name + home, location, first worker (the full form). */
export function OnboardingForm({ initial }: { initial: { ownerName: string; name: string; flat: string; complete: boolean } }) {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [ownerName, setOwnerName] = useState(initial.ownerName);
  const [name, setName] = useState(initial.name);
  const [flat, setFlat] = useState(initial.flat);
  const [homeLabel, setHomeLabel] = useState("");
  const [phase, run] = usePhase();
  const [error, setError] = useState<string | null>(null);

  const next = async () => {
    setError(null);
    let failure: string | null = null;
    const ok = await run(async () => {
      const r = await createHousehold(step === 1 ? { name, ownerName, flat } : { name, ownerName, flat, homeLabel });
      if (!r.ok) failure = r.error;
      return r.ok;
    });
    if (!ok) return setError(failure);
    // An existing home only needed its flat number; send it back to Today.
    if (step === 1 && initial.complete) router.replace("/today");
    else if (step === 1) setStep(2);
    else router.push("/workers/new");
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="rounded-b-[38px] bg-peach px-5 pt-6 pb-[70px] sm:mx-auto sm:mt-10 sm:w-full sm:max-w-[520px] sm:rounded-[30px] sm:pb-8">
        <div className="mb-4 flex gap-1.5">
          {[1, 2, 3].map((n) => (
            <span key={n} className={cn("h-1.5 flex-1 rounded-full", n <= step ? "bg-coral" : "bg-glass")} />
          ))}
        </div>
        <div className="text-[13px] font-bold text-muted">{t("onboarding.step", { n: step })}</div>
        <h1 className="mt-1 font-display text-[34px] font-extrabold leading-[1.05] tracking-[-0.04em]">
          {step === 1 ? t("onboarding.homeTitle") : t("onboarding.locationTitle")}
        </h1>
      </div>
      <div className="-mt-11 px-4 sm:mx-auto sm:mt-4 sm:w-full sm:max-w-[520px]">
        <Card padding="lg" className="flex flex-col gap-4">
          {step === 1 ? (
            <>
              <Field label={t("onboarding.yourName")} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Priya" autoFocus />
              <Field label={t("settings.flat")} value={flat} onChange={(e) => setFlat(e.target.value)} placeholder={t("settings.flatPlaceholder")} maxLength={30} />
              <Field label={t("settings.homeName")} value={name} onChange={(e) => setName(e.target.value)} hint={t("onboarding.homeHint")} placeholder={t("settings.homeNamePlaceholder")} />
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <Field label={t("settings.location")} value={homeLabel} onChange={(e) => setHomeLabel(e.target.value)} placeholder="Koramangala, Bengaluru" autoFocus />
              <button
                type="button"
                onClick={() => {
                  navigator.geolocation?.getCurrentPosition((pos) =>
                    setHomeLabel(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
                  );
                }}
                className="flex h-14 items-center gap-3 rounded-[20px] bg-surface-2 px-4 text-left font-bold"
              >
                <Icon name="pin" size={20} className="text-coral" />
                <span className="flex-1">{t("settings.setLocation")}</span>
              </button>
              <div className="text-xs text-muted">{t("settings.locationHint")}</div>
            </div>
          )}
          {error && <div className="rounded-2xl bg-dispute-bg px-4 py-3 text-sm font-bold text-dispute-fg">{error}</div>}
          <Button size="xl" block onClick={next} phase={phase} loadingText={t("onboarding.saving")} disabled={step === 1 && (!name.trim() || !ownerName.trim() || !flat.trim())}>
            {t("common.next")}
            <Icon name="chevronRight" size={16} />
          </Button>
          {step === 2 && (
            <Button size="lg" variant="ghost" block disabled={phase !== "idle"} onClick={() => router.push("/workers/new")}>
              {t("onboarding.skip")}
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
