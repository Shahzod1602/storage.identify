"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_NAV } from "@/lib/docs";

export function DocsSidebar() {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5">
      <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wide text-faint">
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
            className={`block rounded-md px-3 py-1.5 text-sm transition ${
              active
                ? "bg-brand/10 font-medium text-brand"
                : "text-muted hover:bg-hover hover:text-fg"
            }`}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
