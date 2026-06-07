"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./config";
import { dictionaries, type Dict } from "./dictionaries";

// Faqat LOCALE (string) server→client chegarasidan o'tadi. Lug'at (funksiyalar bilan)
// client tomonida import qilinadi — funksiyalar serialize qilinmaydi.
const LocaleCtx = createContext<Locale>("uz");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <LocaleCtx.Provider value={locale}>{children}</LocaleCtx.Provider>;
}

/** Joriy til lug'ati: const t = useT(); t.common.save */
export function useT(): Dict {
  return dictionaries[useContext(LocaleCtx)];
}

export function useLocale(): Locale {
  return useContext(LocaleCtx);
}

/** Tilni cookie'ga yozadi (server keyingi render'da o'qiydi). */
export function setLocaleCookie(locale: Locale): void {
  document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`;
}
