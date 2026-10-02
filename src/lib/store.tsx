"use client";

import { createContext, startTransition, useCallback, useContext, useMemo, useOptimistic } from "react";
import type { LedgerState } from "./ledger";
import type { Advance, AttendanceEntry, Household, Reminder, Side, Worker } from "./types";

/**
 * Client store = server snapshot + optimistic replay.
 *
 * The server passes the current ledger as `initialState`. Every `dispatch`
 * applies the action locally at once (useOptimistic), then runs the matching
 * server action; when that revalidates, the fresh snapshot replaces the
 * optimistic one. Screens only ever see `state` and `dispatch`.
 */

export interface AppState extends LedgerState {
  household: Household;
}

export type Action =
  | { type: "mark"; workerId: string; date: string; state: "present" | "leave"; by: Side; note?: string }
  | { type: "confirmClaim"; workerId: string; date: string }
  | { type: "rejectClaim"; workerId: string; date: string }
  | { type: "raiseDispute"; workerId: string; date: string; note: string; voiceSeconds?: number }
  | { type: "resolveDispute"; workerId: string; date: string; resolution: "present" | "leave" }
  | { type: "addAdvance"; workerId: string; amount: number; date: string; note?: string }
  | { type: "finalize"; workerId: string; month: string; amountDue: number }
  | { type: "markPaid"; workerId: string; month: string }
  | { type: "remind"; workerId: string; date: string }
  | { type: "endWork"; workerId: string; endDate: string }
  | { type: "updateHousehold"; patch: Partial<Household> }
  | { type: "updateWorker"; workerId: string; patch: Partial<Worker> };

let counter = 0;
const tempId = (prefix: string) => `${prefix}-tmp-${++counter}`;
const nowISO = () => new Date().toISOString();

function append<S extends LedgerState>(
  state: S,
  workerId: string,
  date: string,
  entryState: AttendanceEntry["state"],
  markedBy: Side,
  extra: Partial<AttendanceEntry> = {},
): S {
  const entry: AttendanceEntry = { id: tempId("a"), workerId, date, state: entryState, markedBy, at: nowISO(), ...extra };
  return { ...state, attendance: [...state.attendance, entry] };
}

/** Pure, shared by both sides. Mirrors what the server actions will persist. */
export function reduce<S extends LedgerState & { household?: Household }>(state: S, action: Action): S {
  switch (action.type) {
    case "mark": {
      const s = action.by === "worker" && action.state === "present" ? "claim" : action.state;
      return append(state, action.workerId, action.date, s, action.by, { note: action.note });
    }
    case "confirmClaim":
      return append(state, action.workerId, action.date, "present", "household");
    case "rejectClaim":
      return append(append(state, action.workerId, action.date, "leave", "household"), action.workerId, action.date, "dispute", "household", {
        note: "claim-rejected",
      });
    case "raiseDispute":
      return append(state, action.workerId, action.date, "dispute", "worker", { note: action.note, voiceSeconds: action.voiceSeconds });
    case "resolveDispute":
      return append(state, action.workerId, action.date, action.resolution, "household", { note: "dispute-resolved" });
    case "addAdvance": {
      const adv: Advance = { id: tempId("adv"), workerId: action.workerId, amount: action.amount, date: action.date, note: action.note };
      return { ...state, advances: [...state.advances, adv] };
    }
    case "finalize":
      return {
        ...state,
        settlements: [
          ...state.settlements.filter((s) => !(s.workerId === action.workerId && s.month === action.month)),
          { workerId: action.workerId, month: action.month, amountDue: action.amountDue, finalizedAt: nowISO() },
        ],
      };
    case "markPaid":
      return {
        ...state,
        settlements: state.settlements.map((s) =>
          s.workerId === action.workerId && s.month === action.month ? { ...s, paidAt: nowISO() } : s,
        ),
      };
    case "remind": {
      const r: Reminder = { workerId: action.workerId, date: action.date, at: nowISO() };
      return { ...state, reminders: [...state.reminders.filter((x) => !(x.workerId === r.workerId && x.date === r.date)), r] };
    }
    case "endWork":
      return { ...state, workers: state.workers.map((w) => (w.id === action.workerId ? { ...w, endDate: action.endDate } : w)) };
    case "updateHousehold":
      return state.household ? { ...state, household: { ...state.household, ...action.patch } } : state;
    case "updateWorker":
      return { ...state, workers: state.workers.map((w) => (w.id === action.workerId ? { ...w, ...action.patch } : w)) };
    default:
      return state;
  }
}

export type Perform = (action: Action) => Promise<{ ok: boolean; error?: string }>;

interface StoreContextValue<S> {
  state: S;
  dispatch: (action: Action) => void;
  /** Last server rejection, if any (e.g. "finalized"). */
  lastError: string | null;
}

const StoreContext = createContext<StoreContextValue<AppState> | null>(null);

export function StoreProvider<S extends LedgerState & { household?: Household }>({
  initialState,
  perform,
  onError,
  children,
}: {
  initialState: S;
  perform: Perform;
  onError?: (error: string) => void;
  children: React.ReactNode;
}) {
  const [state, apply] = useOptimistic(initialState, reduce<S>);

  const dispatch = useCallback(
    (action: Action) => {
      startTransition(async () => {
        apply(action);
        const result = await perform(action);
        if (!result.ok) onError?.(result.error ?? "failed");
      });
    },
    [apply, perform, onError],
  );

  const value = useMemo(() => ({ state, dispatch, lastError: null }), [state, dispatch]);
  return <StoreContext.Provider value={value as unknown as StoreContextValue<AppState>}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue<AppState> {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function useWorker(id: string | undefined): Worker | undefined {
  const { state } = useStore();
  return state.workers.find((w) => w.id === id);
}

export function useActiveWorkers(): Worker[] {
  const { state } = useStore();
  return state.workers.filter((w) => !w.endDate);
}
