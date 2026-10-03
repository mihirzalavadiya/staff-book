"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useTheme, type Theme } from "@/lib/theme";
import { signOut } from "@/server/actions/auth";
import { HEADER_CLASS, MobileTopRow } from "@/components/household/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Segmented } from "@/components/ui/Segmented";
import { Toggle } from "@/components/ui/Toggle";
import { usePush } from "@/components/pwa/usePush";
import {
  PushFailureDialog,
  problemAfter,
  type PushFailureKind,
} from "@/components/pwa/PushFailure";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="px-1 text-[13px] font-extrabold uppercase tracking-wide text-muted">
        {title}
      </div>
      <Card padding="lg" className="flex flex-col gap-4">
        {children}
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { state, dispatch } = useStore();
  const { theme, setTheme } = useTheme();
  const [located, setLocated] = useState(true);
  const push = usePush({ kind: "household" });
  const [pushProblem, setPushProblem] = useState<PushFailureKind | null>(null);
  const enablePush = async () => {
    const on = await push.turnOn();
    setPushProblem(problemAfter(on));
  };
  const [loggingOut, startLogout] = useTransition();

  return (
    <div className="lg:flex lg:min-h-dvh lg:flex-col lg:gap-4 lg:p-5">
      <PushFailureDialog
        kind={pushProblem}
        onClose={() => setPushProblem(null)}
        onRetry={enablePush}
        retrying={push.busy}
      />
      <header className={`${HEADER_CLASS} gap-4 pb-[70px]`}>
        <MobileTopRow title={t("settings.title")} />
        <div className="flex items-center gap-3">
          <Avatar
            initial={state.household.ownerName[0]}
            tone="peach"
            size={56}
            shape="circle"
            className="bg-surface"
          />
          <div>
            <div className="font-display text-[30px] font-extrabold leading-none tracking-[-0.03em]">
              {state.household.name}
            </div>
            <div className="mt-1 text-[15px] font-semibold text-muted">
              {state.household.homeLabel}
            </div>
          </div>
        </div>
      </header>

      <div className="-mt-11 flex flex-col gap-5 px-4 lg:mt-0 lg:grid lg:grid-cols-2 lg:items-start lg:px-0">
        <Section title={t("settings.home")}>
          <Field
            label={t("settings.homeName")}
            value={state.household.name}
            onChange={(e) =>
              dispatch({
                type: "updateHousehold",
                patch: { name: e.target.value },
              })
            }
          />
          <div>
            <div className="mb-1.5 text-[13px] font-bold text-muted">
              {t("settings.location")}
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
              <Icon
                name="pin"
                size={18}
                className={located ? "text-coral" : "text-muted"}
              />
              <div className="flex-1 text-sm font-semibold">
                {located ? state.household.homeLabel : "—"}
              </div>
              <Button size="sm" variant="soft" onClick={() => setLocated(true)}>
                {t("settings.setLocation")}
              </Button>
            </div>
            <div className="mt-1.5 text-xs text-muted">
              {t("settings.locationHint")}
            </div>
          </div>
        </Section>

        <Section title={t("settings.notifications")}>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="font-bold">{t("settings.push")}</div>
              <div className="text-xs text-muted">
                {push.status === "blocked" ? (
                  <button
                    type="button"
                    className="font-bold text-coral underline"
                    onClick={() => setPushProblem("blocked")}
                  >
                    {t("pushUi.blockedTitle")}
                  </button>
                ) : push.status === "unsupported" ? (
                  t("pushUi.unsupported")
                ) : (
                  t("settings.pushHint")
                )}
              </div>
            </div>
            <Toggle
              checked={push.status === "on"}
              disabled={
                push.busy ||
                push.status === "loading" ||
                push.status === "unsupported"
              }
              onChange={(next) => void (next ? enablePush() : push.turnOff())}
              label={t("settings.push")}
            />
          </div>
          {push.permission && (
            <div className="-mt-2 flex items-center gap-2 text-xs font-semibold text-muted">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  push.permission === "granted"
                    ? "bg-present-dot"
                    : push.permission === "denied"
                      ? "bg-dispute-dot"
                      : "bg-claim-dot",
                )}
              />
              {t("pushUi.permission")}: {t(`pushUi.permission_${push.permission}`)}
            </div>
          )}
          <div>
            <div className="mb-1.5 text-[13px] font-bold text-muted">
              {t("settings.reminder")}
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
              <Icon name="clock" size={18} className="text-muted" />
              <input
                type="time"
                value={state.household.notifyAt}
                onChange={(e) =>
                  dispatch({
                    type: "updateHousehold",
                    patch: { notifyAt: e.target.value },
                  })
                }
                className="flex-1 bg-transparent font-display text-lg font-bold outline-none [&::-webkit-calendar-picker-indicator]:opacity-0"
              />
            </div>
            <div className="mt-1.5 text-xs text-muted">
              {t("settings.reminderHint")}
            </div>
          </div>
        </Section>

        <Section title={t("settings.language")}>
          <Segmented
            value={lang}
            onChange={setLang}
            options={LANGUAGES.map((l) => ({ value: l.code, label: l.native }))}
            size="lg"
          />
        </Section>

        <Section title={t("settings.appearance")}>
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "system"] as Theme[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTheme(k)}
                className={cn(
                  "h-12 rounded-2xl text-[15px] font-bold",
                  theme === k ? "bg-coral text-white" : "bg-surface-2",
                )}
              >
                {t(`settings.${k}`)}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t("settings.account")}>
          <Button
            variant="danger"
            size="lg"
            block
            loading={loggingOut}
            loadingText={t("settings.loggingOut")}
            onClick={() => startLogout(() => signOut())}
          >
            <Icon name="logout" size={16} />
            {t("settings.logout")}
          </Button>
        </Section>
      </div>
    </div>
  );
}
