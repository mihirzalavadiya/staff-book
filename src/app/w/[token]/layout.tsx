import { notFound } from "next/navigation";
import { WorkerShell } from "@/components/worker/WorkerShell";
import { WorkerStore } from "@/components/worker/WorkerStore";
import { loadWorkerState } from "@/server/queries/worker";

/** The secret link is the login: an unknown or archived token is simply a 404. */
export default async function WorkerLayout({ params, children }: { params: Promise<{ token: string }>; children: React.ReactNode }) {
  const { token } = await params;
  const state = await loadWorkerState(token);
  if (!state) notFound();

  return (
    <WorkerStore token={token} initialState={state}>
      <WorkerShell>{children}</WorkerShell>
    </WorkerStore>
  );
}
