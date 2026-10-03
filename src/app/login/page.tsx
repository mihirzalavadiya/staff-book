"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { usePhase } from "@/lib/usePhase";
import { googleSignInUrl, postLoginPath, sendEmailOtp, signInWithPassword, verifyEmailOtp } from "@/server/actions/auth";
import { Wordmark } from "@/components/household/PageHeader";
import { Button } from "@/components/ui/Button";
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
  const [sendPhase, runSend] = usePhase({ ceremony: true });
  const [verifyPhase, runVerify] = usePhase({ ceremony: true });
  const [passwordPhase, runPassword] = usePhase({ ceremony: true });
  const [googleBusy, setGoogleBusy] = useState(false);
  const busy = sendPhase !== "idle" || verifyPhase !== "idle" || passwordPhase !== "idle" || googleBusy;
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    let failure: string | null = null;
    const ok = await runSend(async () => {
      const r = await sendEmailOtp(email);
      if (!r.ok) failure = r.error;
      return r.ok;
    });
    if (!ok) return setError(failure);
    setStep("code");
  };

  const verify = async () => {
    setError(null);
    let failure: string | null = null;
    const ok = await runVerify(async () => {
      const r = await verifyEmailOtp(email, code);
      if (!r.ok) failure = r.error;
      return r.ok;
    });
    if (!ok) return setError(failure);
    router.replace(await postLoginPath());
  };

  const loginWithPassword = async () => {
    setError(null);
    let failure: string | null = null;
    const ok = await runPassword(async () => {
      const r = await signInWithPassword(email, password);
      if (!r.ok) failure = r.error;
      return r.ok;
    });
    if (!ok) return setError(failure);
    router.replace(await postLoginPath());
  };

  const google = async () => {
    setGoogleBusy(true);
    const r = await googleSignInUrl();
    if (!r.ok) {
      setGoogleBusy(false);
      return setError(r.error);
    }
    window.location.assign(r.data.url);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="flex flex-1 flex-col justify-end bg-peach px-[22px] pt-8 pb-[84px] sm:flex-none sm:pt-16 sm:pb-24">
        <Wordmark className="mb-auto block text-[28px] sm:mx-auto sm:mb-10 sm:w-full sm:max-w-[520px]" />
        <h1 className="font-display text-[54px] leading-[0.98] tracking-[-0.035em] sm:mx-auto sm:w-full sm:max-w-[520px]">{t("login.title")}</h1>
        <p className="mt-3 font-display text-[19px] leading-[1.35] text-muted sm:mx-auto sm:w-full sm:max-w-[520px]">{t("login.subtitle")}</p>
      </div>
      <div className="relative mx-3.5 -mt-14 rounded-t-[22px] bg-bg px-[18px] pt-6 pb-8 sm:mx-auto sm:w-full sm:max-w-[560px] sm:px-5">
        <div className="flex flex-col gap-3">
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
              <Button size="xl" block disabled={!email.includes("@")} phase={sendPhase} loader="walk" loadingText={t("login.sending")} onClick={send}>
                {t("login.sendCode")}
              </Button>
              <div className="my-1 flex items-center gap-3 text-xs font-bold text-muted-2">
                <span className="h-px flex-1 bg-line" />
                {t("login.or")}
                <span className="h-px flex-1 bg-line" />
              </div>
              <Button size="xl" variant="outline" block disabled={busy && !googleBusy} loading={googleBusy} loadingText={t("login.redirecting")} onClick={google}>
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
              <Button size="xl" block disabled={!email.includes("@") || password.length < 6} phase={passwordPhase} loader="walk" loadingText={t("login.signingIn")} onClick={loginWithPassword}>
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
              <Button size="xl" block disabled={code.length < 6} phase={verifyPhase} loader="walk" loadingText={t("login.verifying")} onClick={verify}>
                {t("login.verify")}
              </Button>
              <Button size="lg" variant="ghost" block disabled={busy} onClick={() => setStep("email")}>
                {t("common.back")}
              </Button>
            </>
          )}
          {error && <div className="rounded-[6px] bg-dispute-bg px-4 py-3 text-sm font-bold text-dispute-fg">{error}</div>}
          <div className="pt-2 text-center text-xs font-semibold text-muted">{t("login.worker")}</div>
          <div className="flex justify-center gap-4 text-xs font-semibold text-muted-2">
            <a href="/privacy" className="underline">Privacy</a>
            <a href="/terms" className="underline">Terms</a>
          </div>
        </div>
      </div>
    </div>
  );
}
