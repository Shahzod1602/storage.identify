"use client";

import { useState } from "react";
import { ExternalLink, FileCode2, Copy, Check, Loader2 } from "lucide-react";
import { useProject } from "@/components/project-context";
import { GATEWAY, getTypes } from "@/lib/api";
import { copyText, toast } from "@/components/feedback";
import { useT } from "@/lib/i18n/client";

export default function SettingsPage() {
  const { ref, keys, error } = useProject();
  const t = useT();
  const [types, setTypes] = useState<string | null>(null);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadTypes() {
    setLoadingTypes(true);
    setTypesError(null);
    try {
      setTypes(await getTypes(ref));
    } catch (e) {
      setTypesError((e as Error).message);
    } finally {
      setLoadingTypes(false);
    }
  }

  function download() {
    if (!types) return;
    const blob = new Blob([types], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ref}.types.ts`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error)
    return (
      <Scroll>
        <div className="alert-danger">{error}</div>
      </Scroll>
    );
  if (!keys)
    return (
      <Scroll>
        <p className="text-sm text-faint">{t.common.loading}</p>
      </Scroll>
    );

  const docsUrl = `${GATEWAY}/v1/${ref}/docs?apikey=${encodeURIComponent(keys.anon_key)}`;

  return (
    <Scroll>
      <div className="mb-8">
        <h1 className="text-2xl font-medium">{t.settings.title}</h1>
        <p className="mt-1 text-sm text-muted">{t.settings.subtitle}</p>
      </div>

      {/* API hujjatlari */}
      <section className="mb-6 card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{t.settings.apiDocs}</p>
            <p className="mt-1 text-xs text-muted">{t.settings.apiDocsDesc}</p>
          </div>
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-default shrink-0"
          >
            <ExternalLink size={14} /> {t.settings.open}
          </a>
        </div>
      </section>

      {/* TypeScript turlari */}
      <section className="mb-6 card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{t.settings.tsTypes}</p>
            <p className="mt-1 text-xs text-muted">{t.settings.tsTypesDesc}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              className="btn-default"
              onClick={loadTypes}
              disabled={loadingTypes}
            >
              {loadingTypes ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileCode2 size={14} />
              )}
              {types ? t.settings.regenerate : t.settings.generate}
            </button>
          </div>
        </div>

        {typesError && (
          <p className="mt-3 text-xs text-danger">{typesError}</p>
        )}

        {types && (
          <div className="mt-4">
            <div className="mb-2 flex justify-end gap-2">
              <button
                className="btn-ghost btn-xs"
                onClick={async () => {
                  if (await copyText(types)) {
                    setCopied(true);
                    toast.success(t.common.copied);
                    setTimeout(() => setCopied(false), 1200);
                  }
                }}
              >
                {copied ? (
                  <Check size={13} className="text-brand" />
                ) : (
                  <Copy size={13} />
                )}
                {t.common.copy}
              </button>
              <button className="btn-ghost btn-xs" onClick={download}>
                {t.settings.download}
              </button>
            </div>
            <pre className="max-h-80 overflow-auto rounded-md border border-border bg-bg p-4 font-mono text-xs leading-relaxed text-muted">
              {types}
            </pre>
          </div>
        )}
      </section>

      {/* Loyiha ma'lumotlari */}
      <section className="card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium">
          {t.settings.project}
        </div>
        <div className="p-5">
          <Row label={t.settings.name} value={keys.name} />
          <Row label={t.settings.ref} value={ref} mono />
          <Row label={t.settings.apiUrl} value={`${GATEWAY}/v1/${ref}`} mono />
        </div>
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

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center gap-4 last:mb-0">
      <div className="w-24 shrink-0 text-xs text-faint">{label}</div>
      <div className={`text-sm text-fg ${mono ? "font-mono text-xs text-muted" : ""}`}>
        {value}
      </div>
    </div>
  );
}
