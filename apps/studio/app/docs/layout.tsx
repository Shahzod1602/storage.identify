import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { DocsSidebar } from "@/components/docs/docs-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getLocale, getDict } from "@/lib/i18n/server";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const d = getDict(await getLocale());
  return (
    <div className="min-h-screen bg-bg">
      <nav className="sticky top-0 z-30 border-b border-border/70 bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold tracking-tight"
            >
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-fg shadow-sm">
                s
              </span>
              storagedb
            </Link>
            <span className="text-faint">/</span>
            <span className="text-sm text-secondary">{d.docs.title}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href="https://github.com/Shahzod1602/storage.identify"
              target="_blank"
              className="btn-ghost"
            >
              <Github size={15} /> GitHub
            </a>
            <LocaleSwitcher />
            <ThemeToggle />
            <Link href="/dashboard" className="btn">
              {d.nav.dashboard} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto flex max-w-6xl gap-12 px-6 py-12">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <DocsSidebar />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
