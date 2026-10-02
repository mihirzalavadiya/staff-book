"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useWorkerLink } from "./WorkerStore";

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (reason: string, voiceSeconds?: number) => void;
}

const REASONS = ["came", "half", "other"] as const;

/** "Is this wrong?" — three preset reasons and a hold-to-record voice note. */
export function DisputeSheet({ open, onClose, onSend }: Props) {
  // The body only mounts while open, so its state resets every time the sheet closes.
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={useI18n().t("worker.disputeTitle")}
    >
      {open && <DisputeBody onSend={onSend} />}
    </Sheet>
  );
}

function DisputeBody({ onSend }: { onSend: Props["onSend"] }) {
  const { t } = useI18n();
  const { me } = useWorkerLink();
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<number | null>(null);

  const start = () => {
    setRecording(true);
    setSeconds(0);
    timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  };
  const stop = () => {
    setRecording(false);
    if (timer.current) window.clearInterval(timer.current);
  };

  const label = (r: (typeof REASONS)[number]) =>
    r === "came"
      ? t("worker.disputeCame", { gender: me.gender })
      : r === "half"
        ? t("worker.disputeHalf")
        : t("worker.disputeOther");

  return (
    <div className="flex flex-col gap-2.5">
      {REASONS.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setReason(r)}
          aria-pressed={reason === r}
          className={cn(
            "flex h-16 items-center justify-between rounded-[20px] px-5 text-[21px] font-extrabold",
            reason === r ? "bg-coral text-white" : "bg-surface-2",
          )}
        >
          {label(r)}
          {reason === r && <Icon name="check" size={22} />}
        </button>
      ))}
      <button
        type="button"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        className={cn(
          "mt-1 flex h-[72px] select-none items-center justify-center gap-3 rounded-[22px] border-[2.5px] text-[21px] font-extrabold",
          recording
            ? "border-dispute-fg bg-dispute-bg text-dispute-fg"
            : "border-ink bg-surface",
        )}
      >
        <Icon name="mic" size={26} />
        {recording
          ? `${t("worker.recording")} ${seconds}s`
          : seconds > 0
            ? `${t("common.voice")} · 0:${String(seconds).padStart(2, "0")}`
            : t("worker.holdToRecord")}
      </button>
      <button
        type="button"
        disabled={!reason}
        onClick={() => reason && onSend(reason, seconds || undefined)}
        className="flex h-[66px] items-center justify-center gap-3 rounded-[22px] bg-coral text-[24px] font-extrabold text-white disabled:opacity-40"
      >
        <Icon name="check" size={26} strokeWidth={3} />
        {t("worker.send")}
      </button>
    </div>
  );
}
