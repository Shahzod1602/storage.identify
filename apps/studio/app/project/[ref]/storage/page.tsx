"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/components/project-context";
import { metaQuery, GATEWAY } from "@/lib/api";
import { RowsTable } from "@/components/rows-table";

interface Bucket {
  id: string;
  public: boolean;
}

export default function StoragePage() {
  const { ref, keys } = useProject();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [objects, setObjects] = useState<Record<string, unknown>[]>([]);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!keys) return;
    try {
      const b = await metaQuery(
        ref,
        keys.service_key,
        `select id, public from storage.buckets order by id`,
      );
      setBuckets(b as unknown as Bucket[]);
      setObjects(
        await metaQuery(
          ref,
          keys.service_key,
          `select bucket_id, name, size, mime_type, created_at
           from storage.objects order by created_at desc limit 100`,
        ),
      );
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void reload();
  }, [ref, keys]);

  async function createBucket() {
    if (!keys || !name.trim()) return;
    const res = await fetch(`${GATEWAY}/v1/${ref}/storage/v1/bucket`, {
      method: "POST",
      headers: { apikey: keys.service_key, "content-type": "application/json" },
      body: JSON.stringify({ id: name.trim(), public: isPublic }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Xato");
      return;
    }
    setName("");
    await reload();
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Storage</h1>

      <div className="card flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="bucket nomi"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-neutral-400">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          public
        </label>
        <button className="btn" onClick={createBucket}>
          + Bucket
        </button>
      </div>

      {error && <div className="card text-red-400">{error}</div>}

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-400">Bucketlar</h2>
        <div className="flex flex-wrap gap-2">
          {buckets.length === 0 && (
            <p className="text-sm text-neutral-500">Bucket yo'q.</p>
          )}
          {buckets.map((b) => (
            <span
              key={b.id}
              className="rounded-md border border-edge px-3 py-1.5 text-sm"
            >
              {b.id}{" "}
              <span className={b.public ? "text-brand" : "text-neutral-500"}>
                {b.public ? "public" : "private"}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-400">Obyektlar</h2>
        <RowsTable rows={objects} />
      </div>
    </div>
  );
}
