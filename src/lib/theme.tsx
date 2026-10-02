"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { createLocalStore } from "./localStore";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isTheme = (v: string): v is Theme => v === "light" || v === "dark" || v === "system";
const themeStore = createLocalStore<Theme>("sb.theme", "system", isTheme);

function subscribeSystem(listener: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}
const getSystemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
const getSystemDarkServer = () => false;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.get, themeStore.getServer);
  const systemDark = useSyncExternalStore(subscribeSystem, getSystemDark, getSystemDarkServer);
  const resolved: "light" | "dark" = theme === "dark" || (theme === "system" && systemDark) ? "dark" : "light";

  useEffect(() => {
    if (resolved === "dark") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
  }, [resolved]);

  const setTheme = useCallback((t: Theme) => themeStore.set(t), []);
  const toggle = useCallback(() => themeStore.set(resolved === "dark" ? "light" : "dark"), [resolved]);

  const value = useMemo(() => ({ theme, resolved, setTheme, toggle }), [theme, resolved, setTheme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
