import type { DocPage } from "./docs-types";
import { DOCS } from "./docs";
import type { Locale } from "./i18n/config";
import { PROSE_EN, PROSE_RU, type ProseMap } from "./docs-prose";

/**
 * Tarjima faqat MATNNI (title/description/heading/body) almashtiradi.
 * Kod misollari (examples) o'zbekcha manbadan o'zgarmasdan olinadi.
 * Tarjima topilmasa — o'zbekchaga qaytadi (fallback).
 */
function overlay(uz: DocPage[], prose: ProseMap): DocPage[] {
  return uz.map((d) => {
    const p = prose[d.slug];
    if (!p) return d;
    return {
      ...d,
      title: p.title,
      description: p.description,
      sections: d.sections.map((s, i) => ({
        heading: p.sections[i]?.heading ?? s.heading,
        body: p.sections[i]?.body ?? s.body,
        examples: s.examples,
      })),
    };
  });
}

export function getDocs(locale: Locale): DocPage[] {
  if (locale === "en" && Object.keys(PROSE_EN).length) return overlay(DOCS, PROSE_EN);
  if (locale === "ru" && Object.keys(PROSE_RU).length) return overlay(DOCS, PROSE_RU);
  return DOCS;
}

export function getDoc(locale: Locale, slug: string): DocPage | undefined {
  return getDocs(locale).find((d) => d.slug === slug);
}

export function getDocNav(locale: Locale): { slug: string; title: string }[] {
  return getDocs(locale).map((d) => ({ slug: d.slug, title: d.title }));
}
