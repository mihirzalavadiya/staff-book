"use client";

import { createContext, startTransition, useCallback, useContext, useMemo, useOptimistic, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "./i18n";
import { withPhases, type Phase } from "./phase";
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

/**
 * Settings edits update the screen as you type; everything else waits for the
 * server so the button that was tapped can show its own loader until then.
 */
const OPTIMISTIC: ReadonlySet<Action["type"]> = new Set(["updateHousehold", "updateWorker"]);

/** Stable identity of an action, so the exact button that sent it can show a loader. */
export function actionKey(action: Action): string {
  return JSON.stringify(action);
}

/** The day an action touches, so sibling buttons for that day lock while it runs. */
function dayKey(action: Action): string | null {
  if ("workerId" in action && "date" in action) return `${action.workerId}:${action.date}`;
  if ("workerId" in action && "month" in action) return `${action.workerId}:${action.month}`;
  return null;
}

interface Flight {
  key: string;
  day: string | null;
  phase: Exclude<Phase, "idle">;
}

interface StoreContextValue<S> {
  state: S;
  /** Runs an action on the server; resolves after the success animation, or at once on failure. */
  dispatch: (action: Action, onPhase?: (p: Phase) => void) => Promise<boolean>;
  /** Where this exact action is in its save animation. */
  phaseOf: (action: Action) => Phase;
  /** True while any action for the same worker and day (or month) is in flight. */
  isLocked: (action: Action) => boolean;
  /** Set when the server rejected or could not be reached. */
  error: string | null;
  clearError: () => void;
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
  const [live, apply] = useOptimistic(initialState, reduce<S>);
  const [flights, setFlights] = useState<ReadonlyArray<Flight>>([]);
  const [error, setError] = useState<string | null>(null);
  // While a save animates, keep showing the screen as it was when the button was tapped,
  // so the button does not vanish mid-sprint when the server's fresh data lands.
  const [frozen, setFrozen] = useState<S | null>(null);
  const state = frozen ?? live;
  const router = useRouter();

  const setPhase = useCallback((key: string, day: string | null, phase: Phase) => {
    setFlights((list) => {
      const rest = list.filter((f) => f.key !== key);
      const next = phase === "idle" ? rest : [...rest, { key, day, phase }];
      if (next.length === 0) setFrozen(null);
      return next;
    });
  }, []);

  const dispatch = useCallback(
    (action: Action, onPhase?: (p: Phase) => void) => {
      const key = actionKey(action);
      const day = dayKey(action);
      setError(null);
      if (OPTIMISTIC.has(action.type)) {
        return new Promise<boolean>((resolve) => {
          startTransition(async () => {
            apply(action);
            const result = await perform(action).catch(() => ({ ok: false, error: "network" }));
            if (!result.ok) setError(result.error ?? "failed");
            resolve(result.ok);
          });
        });
      }
      setFrozen((f) => f ?? live);
      let settled = false;
      return withPhases(
        () =>
          new Promise<boolean>((resolve) => {
            startTransition(async () => {
              const result = await perform(action).catch(() => ({ ok: false, error: "network" }));
              if (!result.ok) {
                setError(result.error ?? "failed");
                onError?.(result.error ?? "failed");
              }
              settled = result.ok;
              resolve(result.ok);
            });
          }),
        (p) => {
          setPhase(key, day, p);
          onPhase?.(p);
          // A failure may be a timeout whose request still landed: reload so the screen shows what the server has.
          if (p === "idle" && !settled) {
            // Ended without success: maybe a timeout whose request still landed. Reload to show the server's truth.
            setError((e) => e ?? "timeout");
            router.refresh();
          }
        },
      );
    },
    [apply, perform, onError, live, setPhase, router],
  );

  const phaseOf = useCallback(
    (action: Action): Phase => flights.find((f) => f.key === actionKey(action))?.phase ?? "idle",
    [flights],
  );

  const isLocked = useCallback(
    (action: Action) => {
      const day = dayKey(action);
      return day !== null && flights.some((f) => f.day === day);
    },
    [flights],
  );

  const clearError = useCallback(() => setError(null), []);
  const value = useMemo(
    () => ({ state, dispatch, phaseOf, isLocked, error, clearError }),
    [state, dispatch, phaseOf, isLocked, error, clearError],
  );
  return <StoreContext.Provider value={value as unknown as StoreContextValue<AppState>}>{children}</StoreContext.Provider>;
}

/**
 * Props for a button that sends one action: its own walker-and-ball loader
 * while it runs, and disabled while another action for the same day runs.
 *
 *   <Button {...act({ type: "confirmClaim", workerId, date })}>Yes</Button>
 */
export function useAct() {
  const { dispatch, phaseOf, isLocked } = useStore();
  const { t } = useI18n();
  return (action: Action, opts: { disabled?: boolean } = {}) => {
    const phase = phaseOf(action);
    return {
      phase,
      loadingText: t("common.saving"),
      disabled: Boolean(opts.disabled) || (isLocked(action) && phase === "idle"),
      onClick: () => void dispatch(action),
    };
  };
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
