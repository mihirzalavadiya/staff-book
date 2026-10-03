"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { dayShort, formatDayMonth, monthOf } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { attendancePercent, dayInfo, monthSummary } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { roleName } from "@/lib/roles";
import { homeLabel } from "@/lib/home";
import { useStore } from "@/lib/store";
import type { Phase } from "@/lib/phase";
import { useOrigin } from "@/lib/useOrigin";
import { DayStateBlock } from "@/components/household/WorkerCard";
import { MonthGrid } from "@/components/household/MonthGrid";
import { HEADER_CLASS, SHEET_CLASS, HeaderIconButton } from "@/components/household/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { EditWorkerSheet } from "@/components/household/EditWorkerSheet";

export default function WorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useI18n();
  const { state, dispatch } = useStore();
  const router = useRouter();
  const [endOpen, setEndOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [endDate, setEndDate] = useState(state.today);
  const [copied, setCopied] = useState(false);
  const [endPhase, setEndPhase] = useState<Phase>("idle");
  const origin = useOrigin();
  const worker = state.workers.find((w) => w.id === id);
  if (!worker) return null;

  const month = monthOf(state.today);
  const summary = monthSummary(state, worker, month);
  const info = dayInfo(state, worker, state.today);
  const link = `${origin}/w/${worker.token}`;
  const waText = encodeURIComponent(
    t("addWorker.shareBody", { name: worker.name, gender: worker.gender, house: homeLabel(state.household.name, state.household.flat), link }),
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="lg:flex lg:min-h-dvh lg:flex-col">
      <header className={`${HEADER_CLASS} gap-4 pb-[76px]`}>
        <div className="flex items-center gap-2.5">
          <HeaderIconButton icon="chevronLeft" href="/workers" label={t("common.back")} />
          <div className="flex-1" />
          {!worker.endDate && (
            <button type="button" onClick={() => setEditOpen(true)} className="flex h-11 items-center gap-2 rounded-[6px] bg-surface px-4 text-sm font-bold">
              <Icon name="settings" size={16} />
              {t("workers.edit")}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3.5">
          <Avatar initial={worker.name[0]} tone={worker.tone} size={64} className="ring-4 ring-surface" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-[30px] leading-none tracking-[-0.03em]">{worker.name}</div>
            {worker.linkPending && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-muted">
                <Icon name="clock" size={12} />
                {t("workers.linkPending", { name: worker.name })}
              </div>
            )}
            <div className="mt-1 text-[15px] font-semibold text-muted">
              {roleName(t, worker.role, worker.roleLabel)} · {t("workers.since", { date: formatDayMonth(worker.startDate, lang) })}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-[22px] tabular">{formatINR(worker.salary)}</div>
            <div className="text-[11px] text-muted">{t("common.perMonth")}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[6px] bg-glass-2 p-3">
            <div className="text-[11px] font-bold text-muted">{t("workers.attendanceLabel")}</div>
            <div className="font-display text-2xl">{attendancePercent(state, worker)}%</div>
          </div>
          <div className="rounded-[6px] bg-glass-2 p-3">
            <div className="text-[11px] font-bold text-muted">{t("hisaab.present", { gender: worker.gender })}</div>
            <div className="font-display text-2xl">{summary.present}</div>
          </div>
          <div className="rounded-[6px] bg-glass-2 p-3">
            <div className="text-[11px] font-bold text-muted">{t("hisaab.leave")}</div>
            <div className="font-display text-2xl">{summary.leave}</div>
          </div>
        </div>
      </header>

      <div className={`${SHEET_CLASS} -mt-14 pb-6 lg:pb-10 flex flex-col gap-3.5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4`}>
        <div className="flex flex-col gap-3.5">
          {!worker.endDate && info.state !== "off" && (
            <Card padding="md">
              <div className="mb-3 font-extrabold">{t("common.todayLabel")}</div>
              <DayStateBlock worker={worker} date={state.today} info={info} />
            </Card>
          )}
          <Card padding="none" className="px-4 pt-4 pb-3.5">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-extrabold">{t("calendar.title")}</div>
              <Link href={`/calendar?worker=${worker.id}`} className="text-xs font-extrabold text-coral">
                {t("calendar.fullCalendar")} →
              </Link>
            </div>
            <MonthGrid worker={worker} month={month} />
          </Card>
        </div>

        <div className="flex flex-col gap-3.5">
          <Card padding="none" className="px-[18px] py-1">
            <div className="flex items-center justify-between py-3">
              <span className="font-semibold text-muted">{t("workers.workDays")}</span>
              <span className="flex gap-1">
                {dayShort(lang).map((d, i) => (
                  <span
                    key={d}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${worker.workDays.includes(i) ? "bg-coral-soft text-coral" : "bg-surface-2 text-off-fg"}`}
                  >
                    {d[0]}
                  </span>
                ))}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-line py-3">
              <span className="font-semibold text-muted">{t("workers.paidLeaves")}</span>
              <span className="font-display">{worker.paidLeavesPerMonth}</span>
            </div>
            <div className="flex items-center justify-between border-t border-line py-3">
              <span className="font-semibold text-muted">{t("workers.phone")}</span>
              <span className="font-bold tabular">{worker.phone}</span>
            </div>
            <div className="flex items-center justify-between border-t border-line py-3">
              <span className="font-semibold text-muted">{t("workers.language")}</span>
              <span className="font-bold">{worker.language === "hi" ? "हिन्दी" : "English"}</span>
            </div>
          </Card>

          <Card padding="md" className="flex flex-col gap-3">
            <div className="font-extrabold">{t("workers.shareLink")}</div>
            <div className="flex items-center gap-2 rounded-[6px] bg-surface-2 px-3.5 py-3 text-[13px] font-semibold">
              <Icon name="link" size={16} className="flex-none text-muted" />
              <span className="min-w-0 flex-1 truncate">/w/{worker.token}</span>
              <button type="button" onClick={copy} className="font-extrabold text-coral">
                {copied ? t("common.copied") : t("common.copy")}
              </button>
            </div>
            <div className="text-xs text-muted">{t("workers.linkHint")}</div>
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-[50px] items-center justify-center gap-2 rounded-[6px] bg-present-fg text-[15px] font-bold text-white"
            >
              <Icon name="whatsapp" size={18} />
              {t("addWorker.whatsapp")}
            </a>
          </Card>

          {!worker.endDate ? (
            <Button variant="danger" size="lg" block onClick={() => setEndOpen(true)}>
              <Icon name="archive" size={16} />
              {t("workers.endWork")}
            </Button>
          ) : (
            <Card padding="md" className="flex items-center gap-3">
              <Icon name="archive" size={18} className="text-muted" />
              <div className="flex-1 text-sm font-semibold text-muted">
                {t("workers.period", { from: formatDayMonth(worker.startDate, lang), to: formatDayMonth(worker.endDate, lang) })}
              </div>
              <Button size="sm" variant="soft">
                <Icon name="share" size={12} />
                {t("workers.shareProfile")}
              </Button>
            </Card>
          )}
        </div>
      </div>

      <EditWorkerSheet worker={worker} open={editOpen} onClose={() => setEditOpen(false)} />
      <Sheet open={endOpen} onClose={() => setEndOpen(false)} title={t("workers.endWork")}>
        <div className="flex flex-col gap-3">
          <Field label={t("common.todayLabel")} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <div className="text-sm text-muted">{t("workers.linkHint")}</div>
          <Button
            size="xl"
            block
            variant="danger"
            phase={endPhase}
            loadingText={t("common.saving")}
            onClick={async () => {
              const ok = await dispatch({ type: "endWork", workerId: worker.id, endDate }, setEndPhase);
              if (!ok) return;
              setEndOpen(false);
              router.push("/workers");
            }}
          >
            {t("workers.endWork")}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
