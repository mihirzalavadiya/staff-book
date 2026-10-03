"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import { createLocalStore } from "./localStore";
import type { Lang } from "./types";

type Messages = typeof en;
const MESSAGES: Record<Lang, Messages> = { en, hi: hi as Messages };

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
];

const isLang = (v: string): v is Lang => v === "en" || v === "hi";
const langStore = createLocalStore<Lang>("sb.lang", "en", isLang);

type Vars = Record<string, string | number>;

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Vars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Resolves `{var, select, a {text} other {text}}` and `{n, plural, one {text} other {text}}`.
 * Select drives grammatical gender ("आ गई" / "आ गया", she / he); plural picks
 * "1 day" vs "2 days". Falls back to `other` when nothing matches.
 */
/** Parses `key {text} key {text}` where text may itself contain `{placeholders}`. */
function parseOptions(body: string): Record<string, string> {
  const options: Record<string, string> = {};
  let i = 0;
  while (i < body.length) {
    const m = /^\s*(\w+)\s*\{/.exec(body.slice(i));
    if (!m) break;
    const open = i + m[0].length - 1;
    let depth = 0;
    let close = open;
    for (; close < body.length; close++) {
      if (body[close] === "{") depth += 1;
      else if (body[close] === "}" && --depth === 0) break;
    }
    options[m[1]] = body.slice(open + 1, close);
    i = close + 1;
  }
  return options;
}

function resolveSelects(template: string, vars: Vars): string {
  let out = "";
  let i = 0;
  while (i < template.length) {
    const start = template.indexOf("{", i);
    if (start === -1) break;
    const m = /^\{(\w+),\s*(select|plural),\s*/.exec(template.slice(start));
    if (!m) {
      out += template.slice(i, start + 1);
      i = start + 1;
      continue;
    }
    // Find the matching closing brace of this select block.
    let depth = 0;
    let end = start;
    for (; end < template.length; end++) {
      if (template[end] === "{") depth += 1;
      else if (template[end] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const body = template.slice(start + m[0].length, end);
    const options = parseOptions(body);
    const raw = vars[m[1]];
    const key = m[2] === "plural" ? (Number(raw) === 1 ? "one" : "other") : String(raw ?? "");
    out += template.slice(i, start) + (options[key] ?? options.other ?? "");
    i = end + 1;
  }
  return out + template.slice(i);
}

/** Public for tests and server-side formatting. */
export function formatMessage(template: string, vars?: Vars): string {
  const v = vars ?? {};
  const resolved = /, (select|plural),/.test(template) ? resolveSelects(template, v) : template;
  return resolved.replace(/\{(\w+)\}/g, (_, k: string) => (k in v ? String(v[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(langStore.subscribe, langStore.get, langStore.getServer);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => langStore.set(next), []);

  const t = useCallback(
    (key: string, vars?: Vars) => {
      const msg = lookup(MESSAGES[lang], key) ?? lookup(MESSAGES.en, key) ?? key;
      return formatMessage(msg, vars);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
