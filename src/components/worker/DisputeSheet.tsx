"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import type { Phase } from "@/lib/phase";
import { useWorkerLink } from "./WorkerStore";

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (reason: string, voiceSeconds: number | undefined, onPhase: (p: Phase) => void) => Promise<void>;
}

const REASONS = ["came", "half", "other"] as const;

/** "Is this wrong?": three preset reasons. Voice notes come later; the slot shows "coming soon". */
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
  const [phase, setPhase] = useState<Phase>("idle");
  const sending = phase !== "idle";

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
            "flex h-16 items-center justify-between rounded-[6px] border-[1.5px] px-5 text-[19px] font-bold",
            reason === r ? "border-ink bg-ink text-bg" : "border-line bg-surface-2",
          )}
        >
          {label(r)}
          {reason === r && <Icon name="check" size={22} />}
        </button>
      ))}
      <div
        aria-disabled="true"
        className="mt-1 flex h-[72px] items-center justify-center gap-3 rounded-[6px] border-[1.5px] border-dashed border-line-dashed text-[19px] font-semibold text-muted"
      >
        <Icon name="mic" size={24} />
        {t("worker.voiceNote")}
        <span className="label-caps rounded-[3px] bg-surface-2 px-2 py-1 text-[10px]">{t("common.comingSoon")}</span>
      </div>
      <button
        type="button"
        disabled={!reason || sending}
        aria-busy={sending || undefined}
        onClick={async () => {
          if (!reason) return;
          await onSend(reason, undefined, setPhase);
        }}
        className={cn("flex h-[66px] items-center justify-center gap-3 rounded-[6px] bg-ink text-[20px] font-bold text-bg", sending ? "cursor-progress" : "disabled:opacity-40")}
      >
        {sending ? (
          <>
            <Spinner size={26} />
            {t("common.saving")}
          </>
        ) : (
          <>
            <Icon name="check" size={26} strokeWidth={3} />
            {t("worker.send")}
          </>
        )}
      </button>
    </div>
  );
}
