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

interface Item {
  slug: string;
  label: string;
  icon: LucideIcon;
}

const ITEMS: Item[] = [
  { slug: "", label: "Umumiy", icon: Home },
  { slug: "/tables", label: "Table Editor", icon: Table2 },
  { slug: "/sql", label: "SQL Editor", icon: SquareTerminal },
  { slug: "/auth", label: "Authentication", icon: Users },
  { slug: "/storage", label: "Storage", icon: Archive },
  { slug: "/reports", label: "Hisobotlar", icon: BarChart3 },
];

export function IconRail() {
  const params = useParams();
  const pathname = usePathname();
  const ref = String(params.ref);
  const base = `/project/${ref}`;

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center border-r border-border bg-bg py-3">
      <Link
        href="/"
        title="Loyihalar"
        className="mb-4 grid h-8 w-8 place-items-center rounded-md bg-brand text-black transition hover:bg-brand-600"
      >
        <span className="text-sm font-bold">s</span>
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-1">
        {ITEMS.map(({ slug, label, icon: Icon }) => {
          const href = base + slug;
          const active =
            slug === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={slug}
              href={href}
              title={label}
              className={`group relative grid h-9 w-9 place-items-center rounded-md transition ${
                active
                  ? "bg-hover text-brand"
                  : "text-faint hover:bg-hover hover:text-fg"
              }`}
            >
              {active && (
                <span className="absolute -left-3 h-5 w-0.5 rounded-r bg-brand" />
              )}
              <Icon size={18} strokeWidth={1.75} />
            </Link>
          );
        })}
      </nav>

      <button
        title="Sozlamalar"
        className="grid h-9 w-9 place-items-center rounded-md text-faint transition hover:bg-hover hover:text-fg"
      >
        <Settings size={18} strokeWidth={1.75} />
      </button>
    </aside>
  );
}
