"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => window.location.origin;
const getServerSnapshot = () => "";

/** The page origin, empty during SSR so server and client markup match. */
export function useOrigin(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
