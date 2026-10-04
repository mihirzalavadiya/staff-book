"use client";

import { createContext, useCallback, useContext } from "react";
import * as actions from "@/server/actions/worker";
import { workerTopic } from "@/lib/live";
import { StoreProvider, type Action } from "@/lib/store";
import { useLiveUpdates } from "@/lib/useLiveUpdates";
import type { WorkerState } from "@/server/queries/worker";
import type { Engagement } from "@/lib/types";

interface WorkerContextValue {
  token: string;
  me: WorkerState["me"];
  houses: Engagement[];
  invites: Engagement[];
}

const WorkerContext = createContext<WorkerContextValue | null>(null);

/** Wires the shared client store to the worker server actions, keyed by the link token. */
export function WorkerStore({ token, initialState, children }: { token: string; initialState: WorkerState; children: React.ReactNode }) {
  useLiveUpdates([workerTopic(initialState.me.id)]);
  const perform = useCallback(
    async (a: Action) => {
      switch (a.type) {
        case "mark":
          return actions.workerMark({ token, engagementId: a.workerId, date: a.date, state: a.state, note: a.note });
        case "remind":
          return actions.workerRemind({ token, engagementId: a.workerId, date: a.date });
        case "raiseDispute":
          return actions.workerRaiseDispute({ token, engagementId: a.workerId, date: a.date, note: a.note, voiceSeconds: a.voiceSeconds });
        default:
          return { ok: false, error: "unsupported" };
      }
    },
    [token],
  );

  return (
    <WorkerContext.Provider value={{ token, me: initialState.me, houses: initialState.houses, invites: initialState.invites }}>
      <StoreProvider initialState={initialState} perform={perform} onError={(e) => console.warn("[staffbook] action rejected:", e)}>
        {children}
      </StoreProvider>
    </WorkerContext.Provider>
  );
}

export function useWorkerLink(): WorkerContextValue {
  const ctx = useContext(WorkerContext);
  if (!ctx) throw new Error("useWorkerLink must be used inside WorkerStore");
  return ctx;
}
