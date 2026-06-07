import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { FeedbackHosts } from "@/components/feedback";
import { getLocale, getDict } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/client";

export const metadata: Metadata = {
  title: "storagedb Studio",
  description: "Self-hosted BaaS — Postgres, Auth, Storage, Realtime",
};

// Sahifa chizilishidan oldin mavzuni o'rnatadi (FOUC bo'lmasligi uchun).
// Saqlangan tanlov bo'lmasa — tizim (OS) sozlamasiga moslashadi.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(_){document.documentElement.classList.add('dark');}})();`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dict = getDict(locale);
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full font-sans">
        <LocaleProvider locale={locale} dict={dict}>
          {children}
          <FeedbackHosts />
        </LocaleProvider>
      </body>
    </html>
  );
}
