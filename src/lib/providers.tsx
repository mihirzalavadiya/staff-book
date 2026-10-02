"use client";

import { I18nProvider } from "./i18n";
import { ThemeProvider } from "./theme";

/** Preferences only. Data providers live in the household and worker layouts. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  );
}
