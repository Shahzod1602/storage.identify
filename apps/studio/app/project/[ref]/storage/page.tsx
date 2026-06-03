"use client";

import { useEffect, useRef, useState } from "react";
import {
  FolderPlus,
  Upload,
  File as FileIcon,
  Lock,
  Globe,
  RefreshCw,
  Download,
} from "lucide-react";
import { useProject } from "@/components/project-context";
import { metaQuery, GATEWAY } from "@/lib/api";

interface Bucket {
  id: string;
  public: boolean;
}
interface ObjectRow {
  bucket_id: string;
  name: string;
  size: number;
  mime_type: string | null;
}

export default function StoragePage() {
  const { ref, keys } = useProject();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [objects, setObjects] = useState<ObjectRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadBuckets() {
    if (!keys) return;
    try {
      const b = (await metaQuery(
        ref,
        keys.service_key,
        `select id, public from storage.buckets order by id`,
      )) as unknown as Bucket[];
      setBuckets(b);
      if (!active && b.length) setActive(b[0].id);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function loadObjects(bucket: string) {
    if (!keys) return;
    setObjects(
      (await metaQuery(
        ref,
        keys.service_key,
        `select bucket_id, name, size, mime_type from storage.objects
         where bucket_id='${bucket}' order by created_at desc limit 200`,
      )) as unknown as ObjectRow[],
    );
  }

  useEffect(() => {
    void loadBuckets();
  }, [ref, keys]);
  useEffect(() => {
    if (active) void loadObjects(active);
  }, [active, keys]);

  async function newBucket() {
    if (!keys) return;
    const id = prompt("Bucket nomi:");
    if (!id) return;
    const isPublic = confirm("Public bo'lsinmi? (OK = public, Cancel = private)");
    const res = await fetch(`${GATEWAY}/v1/${ref}/storage/v1/bucket`, {
      method: "POST",
      headers: { apikey: keys.service_key, "content-type": "application/json" },
      body: JSON.stringify({ id, public: isPublic }),
    });
    if (!res.ok) setError((await res.json()).error ?? "Xato");
    else await loadBuckets();
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !keys || !active) return;
    const buf = await file.arrayBuffer();
    const res = await fetch(
      `${GATEWAY}/v1/${ref}/storage/v1/object/${active}/${encodeURIComponent(file.name)}`,
      {
        method: "POST",
        headers: {
          apikey: keys.service_key,
          "content-type": file.type || "application/octet-stream",
        },
        body: buf,
      },
    );
    if (!res.ok) setError((await res.json()).error ?? "Yuklash xatosi");
    else await loadObjects(active);
    if (fileRef.current) fileRef.current.value = "";
  }

  const bucket = buckets.find((b) => b.id === active);

  return (
    <div className="flex h-full">
      <div className="flex w-60 shrink-0 flex-col border-r border-border bg-bg">
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
            Bucketlar
          </span>
          <div className="flex gap-1">
            <button className="text-faint hover:text-fg" onClick={loadBuckets}>
              <RefreshCw size={13} />
            </button>
            <button className="text-faint hover:text-fg" onClick={newBucket}>
              <FolderPlus size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto px-2 pb-2">
          {buckets.length === 0 && (
            <p className="px-2 py-2 text-xs text-faint">Bucket yo'q</p>
          )}
          {buckets.map((b) => (
            <button
              key={b.id}
              onClick={() => setActive(b.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition ${
                active === b.id
                  ? "bg-hover text-brand"
                  : "text-muted hover:bg-hover hover:text-fg"
              }`}
            >
              {b.public ? <Globe size={13} /> : <Lock size={13} />}
              <span className="truncate">{b.id}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {!active ? (
          <div className="grid flex-1 place-items-center text-sm text-faint">
            Bucket tanlang yoki yarating
          </div>
        ) : (
          <>
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2 text-[13px]">
                {bucket?.public ? <Globe size={14} /> : <Lock size={14} />}
                <span className="font-medium">{active}</span>
                <span className={`badge ${bucket?.public ? "badge-brand" : ""}`}>
                  {bucket?.public ? "public" : "private"}
                </span>
              </div>
              <button className="btn" onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> Yuklash
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={onUpload}
              />
            </div>

            {error && (
              <div className="m-4 card border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-auto p-2">
              {objects.length === 0 ? (
                <div className="grid place-items-center py-16 text-sm text-faint">
                  Fayl yo'q — "Yuklash" bilan qo'shing
                </div>
              ) : (
                objects.map((o) => (
                  <div
                    key={o.name}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition hover:bg-hover"
                  >
                    <FileIcon size={15} className="text-faint" />
                    <span className="flex-1 truncate">{o.name}</span>
                    <span className="text-xs text-faint">
                      {formatSize(o.size)}
                    </span>
                    <span className="w-32 truncate text-xs text-faint">
                      {o.mime_type}
                    </span>
                    {bucket?.public && (
                      <a
                        href={`${GATEWAY}/v1/${ref}/storage/v1/public/${active}/${o.name}`}
                        target="_blank"
                        className="text-faint hover:text-brand"
                        title="Yuklab olish"
                      >
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
