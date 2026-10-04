"use client";

import { useCallback } from "react";
import * as actions from "@/server/actions/household";
import { householdTopic } from "@/lib/live";
import { StoreProvider, type Action, type AppState } from "@/lib/store";
import { useLiveUpdates } from "@/lib/useLiveUpdates";

/** Wires the shared client store to the household server actions. */
export function HouseholdStore({ initialState, children }: { initialState: AppState; children: React.ReactNode }) {
  useLiveUpdates([householdTopic(initialState.household.id)]);
  const perform = useCallback(async (a: Action) => {
    switch (a.type) {
      case "mark":
        return actions.markDay({ engagementId: a.workerId, date: a.date, state: a.state });
      case "confirmClaim":
        return actions.confirmClaim({ engagementId: a.workerId, date: a.date });
      case "rejectClaim":
        return actions.rejectClaim({ engagementId: a.workerId, date: a.date });
      case "resolveDispute":
        return actions.resolveDispute({ engagementId: a.workerId, date: a.date, resolution: a.resolution });
      case "addAdvance":
        return actions.addAdvance({ engagementId: a.workerId, amount: a.amount, date: a.date, note: a.note });
      case "finalize":
        return actions.finalizeMonth({ engagementId: a.workerId, month: a.month });
      case "markPaid":
        return actions.markPaid({ engagementId: a.workerId, month: a.month });
      case "endWork":
        return actions.endWork({ engagementId: a.workerId, endDate: a.endDate });
      case "updateHousehold":
        return actions.updateHousehold({ name: a.patch.name, flat: a.patch.flat, homeLabel: a.patch.homeLabel, notifyAt: a.patch.notifyAt });
      case "updateWorker":
        return actions.updateWorker({
          engagementId: a.workerId,
          gender: a.patch.gender,
          roleLabel: a.patch.roleLabel,
          salary: a.patch.salary,
          paidLeaves: a.patch.paidLeavesPerMonth,
          workDays: a.patch.workDays,
          language: a.patch.language,
          phone: a.patch.phone,
        });
      default:
        return { ok: false, error: "unsupported" };
    }
  }, []);

  return (
    <StoreProvider initialState={initialState} perform={perform} onError={(e) => console.warn("[staffbook] action rejected:", e)}>
      {children}
    </StoreProvider>
  );
}
