import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import { DocsSidebar } from "@/components/docs/docs-sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-brand text-sm font-bold text-black">
                s
              </span>
              storagedb
            </Link>
            <span className="text-faint">/</span>
            <span className="text-sm text-muted">Docs</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/Shahzod1602/storage.identify"
              target="_blank"
              className="btn-ghost"
            >
              <Github size={15} /> GitHub
            </a>
            <Link href="/dashboard" className="btn">
              Dashboard <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-10">
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-24">
            <DocsSidebar />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
