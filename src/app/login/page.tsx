"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { googleSignInUrl, postLoginPath, sendEmailOtp, signInWithPassword, verifyEmailOtp } from "@/server/actions/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";

type Step = "email" | "code" | "password";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    const r = await sendEmailOtp(email);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setStep("code");
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const r = await verifyEmailOtp(email, code);
    if (!r.ok) {
      setBusy(false);
      return setError(r.error);
    }
    router.replace(await postLoginPath());
  };

  const loginWithPassword = async () => {
    setBusy(true);
    setError(null);
    const r = await signInWithPassword(email, password);
    if (!r.ok) {
      setBusy(false);
      return setError(r.error);
    }
    router.replace(await postLoginPath());
  };

  const google = async () => {
    setBusy(true);
    const r = await googleSignInUrl();
    if (!r.ok) {
      setBusy(false);
      return setError(r.error);
    }
    window.location.assign(r.data.url);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="flex flex-1 flex-col justify-end rounded-b-[38px] bg-peach px-5 pt-8 pb-[70px] sm:mx-auto sm:mt-10 sm:w-full sm:max-w-[520px] sm:flex-none sm:rounded-[30px] sm:pb-10">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-[18px] bg-coral font-display text-3xl font-extrabold text-white">S</div>
        <h1 className="font-display text-[38px] font-extrabold leading-[1.02] tracking-[-0.04em]">{t("login.title")}</h1>
        <p className="mt-3 text-[15px] font-semibold text-muted">{t("login.subtitle")}</p>
      </div>
      <div className="-mt-11 px-4 pb-8 sm:mx-auto sm:mt-4 sm:w-full sm:max-w-[520px]">
        <Card padding="lg" className="flex flex-col gap-3">
          {step === "email" ? (
            <>
              <Field
                label={t("login.email")}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="you@example.com"
                autoFocus
              />
              <Button size="xl" block disabled={busy || !email.includes("@")} onClick={send}>
                {t("login.sendCode")}
              </Button>
              <div className="my-1 flex items-center gap-3 text-xs font-bold text-muted-2">
                <span className="h-px flex-1 bg-line" />
                {t("login.or")}
                <span className="h-px flex-1 bg-line" />
              </div>
              <Button size="xl" variant="outline" block disabled={busy} onClick={google}>
                <Icon name="globe" size={18} />
                {t("login.google")}
              </Button>
              <Button size="lg" variant="ghost" block disabled={busy} onClick={() => setStep("password")}>
                {t("login.usePassword")}
              </Button>
            </>
          ) : step === "password" ? (
            <>
              <Field
                label={t("login.email")}
                type="email"
                inputMode="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
              />
              <Field
                label={t("login.password")}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loginWithPassword()}
              />
              <Button size="xl" block disabled={busy || !email.includes("@") || password.length < 6} onClick={loginWithPassword}>
                {t("login.signIn")}
              </Button>
              <Button size="lg" variant="ghost" block disabled={busy} onClick={() => setStep("email")}>
                {t("login.useCode")}
              </Button>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold text-muted">{t("login.codeSent", { email })}</div>
              <Field
                label={t("login.code")}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                onKeyDown={(e) => e.key === "Enter" && verify()}
                placeholder="123456"
                autoFocus
              />
              <Button size="xl" block disabled={busy || code.length < 6} onClick={verify}>
                {t("login.verify")}
              </Button>
              <Button size="lg" variant="ghost" block disabled={busy} onClick={() => setStep("email")}>
                {t("common.back")}
              </Button>
            </>
          )}
          {error && <div className="rounded-2xl bg-dispute-bg px-4 py-3 text-sm font-bold text-dispute-fg">{error}</div>}
          <div className="pt-2 text-center text-xs font-semibold text-muted">{t("login.worker")}</div>
        </Card>
      </div>
    </div>
  );
}
