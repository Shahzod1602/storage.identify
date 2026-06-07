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
  Trash2,
} from "lucide-react";
import { useProject } from "@/components/project-context";
import { metaQuery, GATEWAY } from "@/lib/api";
import { toast, confirmDialog, promptDialog } from "@/components/feedback";
import { useT } from "@/lib/i18n/client";

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
  const t = useT();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [objects, setObjects] = useState<ObjectRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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
    try {
      setObjects(
        (await metaQuery(
          ref,
          keys.service_key,
          `select bucket_id, name, size, mime_type from storage.objects
           where bucket_id='${bucket}' order by created_at desc limit 200`,
        )) as unknown as ObjectRow[],
      );
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void loadBuckets();
  }, [ref, keys?.service_key]);
  useEffect(() => {
    if (active) void loadObjects(active);
  }, [active, keys?.service_key]);

  async function newBucket() {
    if (!keys) return;
    const res = await promptDialog({
      title: t.storage.newBucketTitle,
      label: t.storage.bucketName,
      placeholder: t.storage.bucketPlaceholder,
      toggleLabel: t.storage.publicToggle,
      confirmLabel: t.common.create,
    });
    if (!res) return;
    const r = await fetch(`${GATEWAY}/v1/${ref}/storage/v1/bucket`, {
      method: "POST",
      headers: { apikey: keys.service_key, "content-type": "application/json" },
      body: JSON.stringify({ id: res.value, public: res.toggle }),
    });
    if (!r.ok) {
      const msg = (await r.json().catch(() => ({}))).error ?? t.storage.bucketFail;
      toast.error(msg);
      return;
    }
    toast.success(t.storage.bucketCreated(res.value));
    await loadBuckets();
    setActive(res.value);
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !keys || !active) return;
    setUploading(true);
    try {
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
      if (!res.ok) {
        const msg = (await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`;
        toast.error(msg);
      } else {
        toast.success(t.storage.uploaded(file.name));
        await loadObjects(active);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function deleteObject(name: string) {
    if (!keys || !active) return;
    const ok = await confirmDialog({
      title: t.storage.deleteTitle,
      message: t.storage.deleteMsg(name),
      danger: true,
      confirmLabel: t.common.delete,
    });
    if (!ok) return;
    const res = await fetch(
      `${GATEWAY}/v1/${ref}/storage/v1/object/${active}/${encodeURIComponent(name)}`,
      { method: "DELETE", headers: { apikey: keys.service_key } },
    );
    if (!res.ok) {
      toast.error(t.storage.deleteFail);
      return;
    }
    toast.success(t.storage.deleted);
    await loadObjects(active);
  }

  const bucket = buckets.find((b) => b.id === active);

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="flex w-full shrink-0 flex-col border-b border-border bg-surface md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
            {t.storage.buckets}
          </span>
          <div className="flex gap-1">
            <button
              className="text-faint transition hover:text-fg"
              onClick={loadBuckets}
              title={t.common.refresh}
            >
              <RefreshCw size={13} />
            </button>
            <button
              className="text-faint transition hover:text-fg"
              onClick={newBucket}
              title={t.storage.newBucketTitle}
            >
              <FolderPlus size={14} />
            </button>
          </div>
        </div>
        <div className="max-h-40 overflow-auto px-2 pb-2 md:max-h-none md:flex-1">
          {buckets.length === 0 && (
            <p className="px-2 py-2 text-xs text-faint">{t.storage.noBuckets}</p>
          )}
          {buckets.map((b) => (
            <button
              key={b.id}
              onClick={() => setActive(b.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition ${
                active === b.id
                  ? "bg-brand/10 font-medium text-brand"
                  : "text-secondary hover:bg-hover hover:text-fg"
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
            {t.storage.selectBucket}
          </div>
        ) : (
          <>
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2 text-[13px]">
                {bucket?.public ? <Globe size={14} /> : <Lock size={14} />}
                <span className="font-medium">{active}</span>
                <span className={`badge ${bucket?.public ? "badge-brand" : ""}`}>
                  {bucket?.public ? t.storage.public : t.storage.private}
                </span>
                <span className="text-faint">· {objects.length}</span>
              </div>
              <button
                className="btn"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Upload size={14} /> {uploading ? t.storage.uploading : t.storage.upload}
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={onUpload}
              />
            </div>

            {error && (
              <div className="m-4 alert-danger text-xs">{error}</div>
            )}

            <div className="flex-1 overflow-auto p-2">
              {objects.length === 0 ? (
                <div className="grid place-items-center py-16 text-sm text-faint">
                  {t.storage.noFiles}
                </div>
              ) : (
                objects.map((o) => (
                  <div
                    key={o.name}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition hover:bg-hover"
                  >
                    <FileIcon size={15} className="shrink-0 text-faint" />
                    <span className="flex-1 truncate">{o.name}</span>
                    <span className="text-xs text-faint">
                      {formatSize(o.size)}
                    </span>
                    <span className="hidden w-32 truncate text-xs text-faint sm:block">
                      {o.mime_type}
                    </span>
                    {bucket?.public && (
                      <a
                        href={`${GATEWAY}/v1/${ref}/storage/v1/public/${active}/${encodeURIComponent(o.name)}`}
                        target="_blank"
                        className="text-faint transition hover:text-brand"
                        title={t.storage.download}
                      >
                        <Download size={14} />
                      </a>
                    )}
                    <button
                      onClick={() => deleteObject(o.name)}
                      className="text-faint opacity-0 transition hover:text-danger group-hover:opacity-100"
                      title={t.common.delete}
                    >
                      <Trash2 size={14} />
                    </button>
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
