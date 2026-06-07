import { cookies, headers } from "next/headers";
import {
  isLocale,
  pickFromAcceptLanguage,
  type Locale,
} from "./config";
import { dictionaries, type Dict } from "./dictionaries";

/** Joriy tilni aniqlaydi: cookie > Accept-Language > default. */
export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const fromCookie = c.get("locale")?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const h = await headers();
  return pickFromAcceptLanguage(h.get("accept-language"));
}

export function getDict(locale: Locale): Dict {
  return dictionaries[locale];
}
