import { uz } from "./uz";
import { en } from "./en";
import { ru } from "./ru";
import type { Locale } from "../config";

/** Lug'at shakli o'zbekchadan olinadi — en/ru aynan mos bo'lishi shart. */
export type Dict = typeof uz;

export const dictionaries: Record<Locale, Dict> = { uz, en, ru };
