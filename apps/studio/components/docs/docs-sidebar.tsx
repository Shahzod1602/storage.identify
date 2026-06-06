"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_NAV } from "@/lib/docs";

export function DocsSidebar() {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
        Hujjatlar
      </div>
      {DOC_NAV.map((item) => {
        const href = `/docs/${item.slug}`;
        const active =
          pathname === href ||
          (item.slug === "getting-started" && pathname === "/docs");
        return (
          <Link
            key={item.slug}
            href={href}
            className={`relative block rounded-lg px-3 py-2 text-[13px] transition-colors ${
              active
                ? "bg-brand/10 font-medium text-brand"
                : "text-secondary hover:bg-hover hover:text-fg"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand" />
            )}
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
