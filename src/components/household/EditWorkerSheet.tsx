"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { dayShort } from "@/lib/date";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import type { Gender, Lang, Worker } from "@/lib/types";
import { usePhase } from "@/lib/usePhase";
import { updateWorker } from "@/server/actions/household";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";

/** Edit a worker's terms for this home and, unless they are shared with other homes, their personal details. */
export function EditWorkerSheet({ worker, open, onClose }: { worker: Worker; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={t("workers.editTitle", { name: worker.name })}>
      {open && <EditForm worker={worker} onDone={onClose} />}
    </Sheet>
  );
}

function EditForm({ worker, onDone }: { worker: Worker; onDone: () => void }) {
  const { t, lang } = useI18n();
  const [phone, setPhone] = useState(worker.phone);
  const [salary, setSalary] = useState(String(worker.salary));
  const [workDays, setWorkDays] = useState<number[]>(worker.workDays);
  const [paidLeaves, setPaidLeaves] = useState(worker.paidLeavesPerMonth);
  const [language, setLanguage] = useState<Lang>(worker.language);
  const [gender, setGender] = useState<Gender>(worker.gender);
  const [roleLabel, setRoleLabel] = useState(worker.roleLabel ?? "");
  const [error, setError] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);
  const [phase, run] = usePhase();
  const shared = Boolean(worker.sharedWithOtherHomes);

  const toggleDay = (d: number) => setWorkDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  const valid = Number(salary) > 0 && workDays.length > 0 && (worker.role !== "other" || roleLabel.trim().length > 0);

  const save = async () => {
    setError(null);
    let failure: string | null = null;
    let joined = false;
    const ok = await run(async () => {
      const r = await updateWorker({
        engagementId: worker.id,
        salary: Number(salary),
        workDays,
        paidLeaves,
        roleLabel: worker.role === "other" ? roleLabel : undefined,
        ...(shared ? {} : { phone, language, gender }),
      });
      if (r.ok) joined = r.data.alreadyOnStaffbook;
      else failure = r.error;
      return r.ok;
    });
    if (!ok) return setError(failure);
    if (joined) setLinked(true);
    else onDone();
  };

  if (linked) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-[6px] bg-av-blue p-3.5 text-sm font-semibold leading-relaxed">{t("workers.linkedNow", { name: worker.name })}</div>
        <Button size="xl" block onClick={onDone}>
          {t("common.done")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto pb-1">
      {shared ? (
        <div className="rounded-[6px] bg-surface-2 p-3.5 text-sm font-semibold text-muted">{t("workers.sharedNote", { name: worker.name, gender: worker.gender })}</div>
      ) : (
        <>
          <Field
            label={t("workers.phone")}
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91"
            hint={t("workers.phoneHint", { gender })}
          />
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
            <div className="mb-2 text-[13px] font-bold text-muted">{t("addWorker.language")}</div>
            <Segmented value={language} onChange={setLanguage} options={LANGUAGES.map((l) => ({ value: l.code, label: l.native }))} />
          </div>
        </>
      )}
      {worker.role === "other" && (
        <Field label={t("addWorker.otherWork")} value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} maxLength={30} />
      )}
      <Field label={t("addWorker.salary")} prefix="₹" inputMode="numeric" value={salary} onChange={(e) => setSalary(e.target.value.replace(/\D/g, ""))} />
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
                className={cn("h-11 rounded-[6px] text-[13px] font-bold", on ? "bg-ink text-bg" : "bg-surface-2 text-muted")}
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
          <button type="button" onClick={() => setPaidLeaves(Math.max(0, paidLeaves - 1))} className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-surface-2">
            −
          </button>
          <span className="w-8 text-center font-display text-2xl">{paidLeaves}</span>
          <button type="button" onClick={() => setPaidLeaves(Math.min(10, paidLeaves + 1))} className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-surface-2">
            <Icon name="plus" size={14} />
          </button>
        </div>
      </div>
      {error && <div className="rounded-[6px] bg-dispute-bg px-4 py-3 text-sm font-bold text-dispute-fg">{error}</div>}
      <Button size="xl" block disabled={!valid} phase={phase} loadingText={t("common.saving")} onClick={save}>
        <Icon name="check" size={16} />
        {t("workers.save")}
      </Button>
    </div>
  );
}
