"use client";

import { useCallback, useState } from "react";
import { withPhases, type Phase } from "./phase";

/** Local phase for one-off server calls (login, onboarding, forms). */
export function usePhase({ ceremony = false }: { ceremony?: boolean } = {}): [Phase, (task: () => Promise<boolean>) => Promise<boolean>] {
  const [phase, setPhase] = useState<Phase>("idle");
  const run = useCallback((task: () => Promise<boolean>) => withPhases(task, setPhase, { ceremony }), [ceremony]);
  return [phase, run];
}
