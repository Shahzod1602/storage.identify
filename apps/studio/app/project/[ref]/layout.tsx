"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, Cloud } from "lucide-react";
import { ProjectProvider, useProject } from "@/components/project-context";
import { IconRail } from "@/components/icon-rail";
import { useRequireAuth } from "@/components/auth-guard";

function Topbar() {
  const { ref, keys } = useProject();
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-bg px-4 text-[13px]">
      <Link href="/dashboard" className="text-muted transition hover:text-fg">
        Loyihalar
      </Link>
      <ChevronRight size={14} className="text-faint" />
      <span className="font-medium text-fg">{keys?.name ?? "…"}</span>
      <code className="kbd ml-1">{ref}</code>
      <span className="ml-auto badge badge-brand">
        <Cloud size={11} /> Local
      </span>
    </header>
  );
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const ref = String(params.ref);
  const ready = useRequireAuth();
  if (!ready) return null;

  return (
    <ProjectProvider refId={ref}>
      <div className="flex h-screen overflow-hidden">
        <IconRail />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </ProjectProvider>
  );
}
