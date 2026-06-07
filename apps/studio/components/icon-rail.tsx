"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  Home,
  Table2,
  SquareTerminal,
  Users,
  Archive,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/lib/i18n/client";
import type { Dict } from "@/lib/i18n/dictionaries";

interface Item {
  slug: string;
  key: keyof Dict["shell"];
  icon: LucideIcon;
}

const ITEMS: Item[] = [
  { slug: "", key: "overview", icon: Home },
  { slug: "/tables", key: "tableEditor", icon: Table2 },
  { slug: "/sql", key: "sqlEditor", icon: SquareTerminal },
  { slug: "/auth", key: "auth", icon: Users },
  { slug: "/storage", key: "storage", icon: Archive },
  { slug: "/reports", key: "reports", icon: BarChart3 },
];

export function IconRail() {
  const params = useParams();
  const pathname = usePathname();
  const t = useT();
  const ref = String(params.ref);
  const base = `/project/${ref}`;

  return (
    <aside className="z-20 flex w-16 shrink-0 flex-col items-center border-r border-border bg-surface py-3">
      <Link
        href="/dashboard"
        title={t.shell.projects}
        className="group relative mb-4 grid h-9 w-9 place-items-center rounded-lg bg-brand text-brand-fg shadow-sm transition hover:bg-brand-600"
      >
        <span className="text-sm font-bold">s</span>
        <Flyout label={t.shell.projects} />
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1">
        {ITEMS.map(({ slug, key, icon: Icon }) => {
          const label = t.shell[key];
          const href = base + slug;
          const active =
            slug === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={slug}
              href={href}
              className={`group relative grid h-10 w-10 place-items-center rounded-lg transition-colors ${
                active
                  ? "bg-brand/10 text-brand"
                  : "text-faint hover:bg-hover hover:text-fg"
              }`}
            >
              {active && (
                <span className="absolute -left-3 h-5 w-[3px] rounded-r-full bg-brand" />
              )}
              <Icon size={18} strokeWidth={1.75} />
              <Flyout label={label} />
            </Link>
          );
        })}
      </nav>

      <Link
        href={`${base}/settings`}
        className={`group relative grid h-10 w-10 place-items-center rounded-lg transition-colors ${
          pathname.startsWith(`${base}/settings`)
            ? "bg-brand/10 text-brand"
            : "text-faint hover:bg-hover hover:text-fg"
        }`}
      >
        {pathname.startsWith(`${base}/settings`) && (
          <span className="absolute -left-3 h-5 w-[3px] rounded-r-full bg-brand" />
        )}
        <Settings size={18} strokeWidth={1.75} />
        <Flyout label={t.shell.settings} />
      </Link>
    </aside>
  );
}

/** Hover'da chiqadigan yorliq (tooltip). */
function Flyout({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md border border-border bg-panel px-2 py-1 text-xs font-medium text-fg shadow-pop group-hover:block">
      {label}
    </span>
  );
}
