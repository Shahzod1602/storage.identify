"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Dict } from "./dictionaries";

interface I18nCtx {
  locale: Locale;
  t: Dict;
}

const Ctx = createContext<I18nCtx | null>(null);

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: ReactNode;
}) {
  return <Ctx.Provider value={{ locale, t: dict }}>{children}</Ctx.Provider>;
}

/** Joriy til lug'ati: const t = useT(); t.common.save */
export function useT(): Dict {
  const c = useContext(Ctx);
  if (!c) throw new Error("useT() faqat <LocaleProvider> ichida ishlaydi");
  return c.t;
}

export function useLocale(): Locale {
  return useContext(Ctx)?.locale ?? "uz";
}

/** Tilni cookie'ga yozadi (server keyingi render'da o'qiydi). */
export function setLocaleCookie(locale: Locale): void {
  document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`;
}
