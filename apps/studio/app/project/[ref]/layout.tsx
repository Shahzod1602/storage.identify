"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ProjectProvider } from "@/components/project-context";

const NAV = [
  { slug: "", label: "Umumiy" },
  { slug: "/sql", label: "SQL Editor" },
  { slug: "/tables", label: "Jadvallar" },
  { slug: "/auth", label: "Auth" },
  { slug: "/storage", label: "Storage" },
];

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const ref = String(params.ref);
  const base = `/project/${ref}`;

  return (
    <ProjectProvider refId={ref}>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-500 hover:text-brand">
          ← Loyihalar
        </Link>
        <code className="kbd">{ref}</code>
      </div>
      <div className="grid grid-cols-[180px_1fr] gap-6">
        <nav className="space-y-1">
          {NAV.map((item) => {
            const href = base + item.slug;
            const active =
              item.slug === ""
                ? pathname === base
                : pathname.startsWith(href);
            return (
              <Link
                key={item.slug}
                href={href}
                className={`block rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-brand/10 text-brand"
                    : "text-neutral-400 hover:bg-panel"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div>{children}</div>
      </div>
    </ProjectProvider>
  );
}
