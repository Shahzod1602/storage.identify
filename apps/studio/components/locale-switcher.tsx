"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";
import { useLocale, setLocaleCookie } from "@/lib/i18n/client";

/** Til almashtirgich (uz/en/ru). Tanlov cookie'da saqlanadi. */
export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function choose(l: Locale) {
    setLocaleCookie(l);
    setOpen(false);
    // Server komponentlari (landing/docs) yangi til bilan qayta render bo'lsin.
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        className="btn-ghost !px-2"
        onClick={() => setOpen((o) => !o)}
        aria-label="Til / Language / Язык"
        title="Til / Language / Язык"
      >
        <Languages size={16} />
        <span className="text-xs font-semibold uppercase">{locale}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1.5 w-40 rounded-lg border border-border bg-panel p-1 shadow-pop">
            {LOCALES.map((l) => (
              <button
                key={l}
                onClick={() => choose(l)}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] transition ${
                  l === locale
                    ? "bg-brand/10 font-medium text-brand"
                    : "text-secondary hover:bg-hover hover:text-fg"
                }`}
              >
                {LOCALE_NAMES[l]}
                <span className="text-[10px] uppercase text-faint">{l}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
