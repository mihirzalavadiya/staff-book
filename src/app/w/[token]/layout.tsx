import { notFound } from "next/navigation";
import { WorkerShell } from "@/components/worker/WorkerShell";
import { WorkerStore } from "@/components/worker/WorkerStore";
import { loadWorkerState } from "@/server/queries/worker";
import { clientIp, hit, isBlocked, LIMITS } from "@/server/rate-limit";

/**
 * The secret link is the login: an unknown or archived token is simply a 404.
 * A network that keeps opening unknown links is paused for a while, so links
 * cannot be found by trying them one after another.
 */
export default async function WorkerLayout({ params, children }: { params: Promise<{ token: string }>; children: React.ReactNode }) {
  const { token } = await params;
  const ip = await clientIp();
  const key = ip && `badlink:${ip}`;
  if (key && (await isBlocked(key, LIMITS.badLinkPerIp))) notFound();
  const state = await loadWorkerState(token);
  if (!state) {
    if (key) await hit(key, LIMITS.badLinkPerIp);
    notFound();
  }

  return (
    <WorkerStore token={token} initialState={state}>
      <WorkerShell>{children}</WorkerShell>
    </WorkerStore>
  );
}
