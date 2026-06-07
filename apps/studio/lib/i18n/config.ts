export const LOCALES = ["uz", "en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";

export const LOCALE_NAMES: Record<Locale, string> = {
  uz: "O'zbek",
  en: "English",
  ru: "Русский",
};

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

/** Accept-Language sarlavhasidan eng mos tilni tanlaydi. */
export function pickFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  // masalan: "en-US,en;q=0.9,ru;q=0.8"
  const langs = header
    .split(",")
    .map((p) => p.trim().split(";")[0]!.slice(0, 2).toLowerCase());
  for (const l of langs) {
    if (isLocale(l)) return l;
  }
  return DEFAULT_LOCALE;
}
