"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { dayShort } from "@/lib/date";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { usePhase } from "@/lib/usePhase";
import { useOrigin } from "@/lib/useOrigin";
import { ROLES, roleName } from "@/lib/roles";
import type { AvatarTone, Gender, Lang, Role } from "@/lib/types";
import { addWorker } from "@/server/actions/household";
import { HEADER_CLASS, HeaderIconButton } from "@/components/household/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";

const TONES: AvatarTone[] = ["purple", "blue", "green", "yellow", "peach"];

export default function NewWorkerPage() {
  const { t, lang } = useI18n();
  const { state } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("female");
  const [role, setRole] = useState<Role>("cook");
  const [roleLabel, setRoleLabel] = useState("");
  const [salary, setSalary] = useState("");
  const [phone, setPhone] = useState("");
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [paidLeaves, setPaidLeaves] = useState(2);
  const [language, setLanguage] = useState<Lang>("hi");
  const [created, setCreated] = useState<{ name: string; token: string } | null>(null);
  const [phase, run] = usePhase();
  const [error, setError] = useState<string | null>(null);
  const origin = useOrigin();

  const toggleDay = (d: number) =>
    setWorkDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const valid =
    name.trim().length > 0 && Number(salary) > 0 && workDays.length > 0 && (role !== "other" || roleLabel.trim().length > 0);

  const create = async () => {
    if (!valid || phase !== "idle") return;
    setError(null);
    let token = "";
    let failure: string | null = null;
    const ok = await run(async () => {
    const result = await addWorker({
      name,
      gender,
      role,
      roleLabel: role === "other" ? roleLabel : undefined,
      salary: Number(salary),
      phone,
      workDays,
      paidLeaves,
      language,
    });
      if (result.ok) token = result.data.token;
      else failure = result.error;
      return result.ok;
    });
    if (!ok) return setError(failure);
    setCreated({ name: name.trim(), token });
  };

  const link = created ? `${origin}/w/${created.token}` : "";
  const waText = created
    ? encodeURIComponent(t("addWorker.shareBody", { name: created.name, gender, house: state.household.name, link }))
    : "";

  return (
    <div className="lg:flex lg:min-h-dvh lg:flex-col lg:gap-4 lg:p-5">
      <header className={`${HEADER_CLASS} gap-3 pb-[70px]`}>
        <div className="flex items-center gap-2.5">
          <HeaderIconButton icon="chevronLeft" href="/workers" label={t("common.back")} />
          <div className="flex-1 font-display text-xl font-extrabold tracking-[-0.03em]">{t("addWorker.title")}</div>
        </div>
        <div className="flex items-center gap-3">
          <Avatar initial={(name.trim()[0] ?? "?").toUpperCase()} tone={TONES[state.workers.length % TONES.length]} size={56} className="ring-4 ring-surface" />
          <div className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em]">
            {name.trim() || t("addWorker.namePlaceholder")}
            <div className="mt-1 text-[15px] font-semibold text-muted">{roleName(t, role, roleLabel)}</div>
          </div>
        </div>
      </header>

      <div className="-mt-11 px-4 lg:mt-0 lg:max-w-[640px] lg:px-0">
        <Card padding="lg" className="flex flex-col gap-5">
          <Field label={t("addWorker.name")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("addWorker.namePlaceholder")} autoFocus />
          <div>
            <div className="mb-2 text-[13px] font-bold text-muted">{t("addWorker.gender")}</div>
            <Segmented
              value={gender}
              onChange={setGender}
              options={[
                { value: "female", label: t("addWorker.female") },
                { value: "male", label: t("addWorker.male") },
              ]}
            />
          </div>
          <div>
            <div className="mb-2 text-[13px] font-bold text-muted">{t("addWorker.role")}</div>
            <Segmented value={role} onChange={setRole} options={ROLES.map((r) => ({ value: r, label: t(`roles.${r}`) }))} />
            {role === "other" && (
              <div className="mt-3">
                <Field
                  label={t("addWorker.otherWork")}
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  placeholder={t("addWorker.otherPlaceholder")}
                  maxLength={30}
                  autoFocus
                />
              </div>
            )}
          </div>
          <Field label={t("addWorker.salary")} prefix="₹" inputMode="numeric" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="4000" />
          <Field label={t("workers.phone")} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91" />
          <div>
            <div className="mb-2 text-[13px] font-bold text-muted">{t("addWorker.workDays")}</div>
            <div className="grid grid-cols-7 gap-1.5">
              {dayShort(lang).map((d, i) => {
                const on = workDays.includes(i);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(i)}
                    aria-pressed={on}
                    className={cn("h-12 rounded-2xl text-[13px] font-bold", on ? "bg-coral text-white" : "bg-surface-2 text-muted")}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[13px] font-bold text-muted">{t("addWorker.paidLeaves")}</div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setPaidLeaves(Math.max(0, paidLeaves - 1))} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2">
                −
              </button>
              <span className="w-8 text-center font-display text-2xl font-extrabold">{paidLeaves}</span>
              <button type="button" onClick={() => setPaidLeaves(Math.min(10, paidLeaves + 1))} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2">
                <Icon name="plus" size={14} />
              </button>
            </div>
          </div>
          <div>
            <div className="mb-2 text-[13px] font-bold text-muted">{t("addWorker.language")}</div>
            <Segmented value={language} onChange={setLanguage} options={LANGUAGES.map((l) => ({ value: l.code, label: l.native }))} />
            <div className="mt-1.5 text-xs text-muted">{t("addWorker.languageHint")}</div>
          </div>
          {error && <div className="rounded-2xl bg-dispute-bg px-4 py-3 text-sm font-bold text-dispute-fg">{error}</div>}
          <Button size="xl" block disabled={!valid} phase={phase} loadingText={t("addWorker.creating")} onClick={create}>
            <Icon name="whatsapp" size={18} />
            {t("addWorker.create")}
          </Button>
        </Card>
      </div>

      <Sheet open={Boolean(created)} onClose={() => router.push("/today")} title={created ? t("addWorker.shareTitle", { name: created.name, gender }) : ""}>
        {created && (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-surface-2 p-3.5 text-sm leading-relaxed">
              {t("addWorker.shareBody", { name: created.name, gender, house: state.household.name, link: "" })}
              <span className="font-bold text-coral">{link}</span>
            </div>
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-[58px] items-center justify-center gap-2 rounded-[20px] bg-present-fg text-base font-bold text-white"
            >
              <Icon name="whatsapp" size={20} />
              {t("addWorker.whatsapp")}
            </a>
            <Button variant="ghost" size="lg" block onClick={() => router.push("/today")}>
              {t("addWorker.later")}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
