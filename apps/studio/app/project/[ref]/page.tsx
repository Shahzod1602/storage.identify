"use client";

import { useState } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { useProject } from "@/components/project-context";
import { GATEWAY } from "@/lib/api";
import { copyText, toast } from "@/components/feedback";

export default function OverviewPage() {
  const { ref, keys, error } = useProject();

  if (error)
    return (
      <Scroll>
        <div className="alert-danger">{error}</div>
      </Scroll>
    );
  if (!keys)
    return (
      <Scroll>
        <p className="text-sm text-faint">Yuklanmoqda...</p>
      </Scroll>
    );

  return (
    <Scroll>
      <div className="mb-8">
        <h1 className="text-2xl font-medium">{keys.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Loyiha ulanish ma'lumotlari va API kalitlari
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Stat label="Postgres" value="ishlamoqda" dot />
        <Stat label="Region" value="Local" />
        <Stat label="ref" value={ref} mono />
      </div>

      <section className="mt-6 card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium">
          Project API
        </div>
        <div className="p-5">
          <Field label="API URL" value={`${GATEWAY}/v1/${ref}`} />
          <Field label="anon (public) key" value={keys.anon_key} secret />
          <Field label="service_role key" value={keys.service_key} secret />
        </div>
      </section>

      <section className="mt-6 card p-5">
        <p className="mb-3 text-sm font-medium">Tezkor boshlash</p>
        <pre className="overflow-x-auto rounded-md border border-border bg-bg p-4 font-mono text-xs leading-relaxed text-muted">
          {`# REST
curl "${GATEWAY}/v1/${ref}/rest/v1/<jadval>?select=*" \\
  -H "apikey: ${keys.anon_key.slice(0, 20)}..."

# Auth
curl -X POST "${GATEWAY}/v1/${ref}/auth/v1/signup" \\
  -H "apikey: <anon>" -d '{"email":"a@b.com","password":"123456"}'`}
        </pre>
      </section>
    </Scroll>
  );
}

function Scroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-4xl px-8 py-8">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  dot,
  mono,
}: {
  label: string;
  value: string;
  dot?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs text-faint">{label}</div>
      <div
        className={`mt-1.5 flex items-center gap-2 text-sm ${mono ? "font-mono" : ""}`}
      >
        {dot && <span className="h-2 w-2 rounded-full bg-brand" />}
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  secret,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  const [shown, setShown] = useState(!secret);
  const [copied, setCopied] = useState(false);
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 text-xs text-faint">{label}</div>
      <div className="flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2">
        <code className="flex-1 truncate font-mono text-xs text-muted">
          {shown ? value : "•".repeat(40)}
        </code>
        {secret && (
          <button
            className="text-faint transition hover:text-fg"
            onClick={() => setShown((v) => !v)}
          >
            {shown ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
        <button
          className="text-faint transition hover:text-fg"
          onClick={async () => {
            if (await copyText(value)) {
              setCopied(true);
              toast.success("Nusxa olindi");
              setTimeout(() => setCopied(false), 1200);
            }
          }}
        >
          {copied ? <Check size={14} className="text-brand" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}
