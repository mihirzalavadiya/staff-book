"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { formatINR } from "@/lib/money";
import { roleName } from "@/lib/roles";
import type { Engagement } from "@/lib/types";
import { workerRespondInvite } from "@/server/actions/worker";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { useWorkerLink } from "./WorkerStore";

/** A home that added this worker's phone, asking them to confirm from their existing link. */
export function InviteCard({ invite }: { invite: Engagement }) {
  const { t } = useI18n();
  const { token, me } = useWorkerLink();
  const [answer, setAnswer] = useState<null | "yes" | "no">(null);
  const [error, setError] = useState(false);

  const respond = async (accept: boolean) => {
    setAnswer(accept ? "yes" : "no");
    setError(false);
    const r = await workerRespondInvite({ token, engagementId: invite.id, accept });
    if (!r.ok) {
      setError(true);
      setAnswer(null);
    }
  };

  return (
    <Card padding="lg" className="border-2 border-dashed border-coral">
      <div className="flex items-center gap-3">
        <Avatar initial={invite.initial} tone={invite.tone} size={48} />
        <div className="min-w-0 flex-1">
          <div className="text-[21px] font-extrabold leading-[1.2]">{t("worker.inviteTitle", { house: invite.houseName })}</div>
          <div className="mt-0.5 text-[17px] font-semibold text-muted">
            {t("worker.inviteBody", {
              role: roleName(t, invite.role, invite.roleLabel),
              salary: formatINR(invite.salary),
              gender: me.gender,
            })}
          </div>
        </div>
      </div>
      <div className="mt-3.5 grid grid-cols-[1fr_auto] gap-2.5">
        <Button size="xl" loading={answer === "yes"} loadingText={t("common.saving")} disabled={answer !== null} onClick={() => respond(true)}>
          <Icon name="check" size={20} strokeWidth={3} />
          {t("worker.inviteYes", { gender: me.gender })}
        </Button>
        <Button size="xl" variant="outline" loading={answer === "no"} loadingText={t("common.saving")} disabled={answer !== null} onClick={() => respond(false)}>
          {t("worker.inviteNo")}
        </Button>
      </div>
      {error && <div className="mt-2 text-sm font-bold text-dispute-fg">{t("common.saveFailed")}</div>}
    </Card>
  );
}
