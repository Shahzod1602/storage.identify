"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listProjects,
  createProject,
  type ProjectSummary,
  type ProjectKeys,
} from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ProjectKeys | null>(null);

  async function reload() {
    try {
      setProjects(await listProjects());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function onCreate() {
    if (!name.trim()) return;
    try {
      const keys = await createProject(name.trim());
      setCreated(keys);
      setName("");
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Loyihalar</h1>
          <p className="text-sm text-neutral-500">
            Har bir loyiha alohida Postgres database'iga ega.
          </p>
        </div>
      </div>

      <div className="card flex gap-3">
        <input
          className="input"
          placeholder="Yangi loyiha nomi"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCreate()}
        />
        <button className="btn whitespace-nowrap" onClick={onCreate}>
          + Loyiha yaratish
        </button>
      </div>

      {created && (
        <div className="card border-brand/40 bg-brand/5">
          <p className="mb-2 font-medium text-brand">
            "{created.name}" yaratildi! Kalitlarni saqlang:
          </p>
          <div className="space-y-1 font-mono text-xs">
            <div>
              <span className="text-neutral-500">ref:</span> {created.ref}
            </div>
            <div className="truncate">
              <span className="text-neutral-500">anon_key:</span>{" "}
              {created.anon_key}
            </div>
            <div className="truncate">
              <span className="text-neutral-500">service_key:</span>{" "}
              {created.service_key}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card border-red-500/40 text-red-400">{error}</div>
      )}

      {loading ? (
        <p className="text-neutral-500">Yuklanmoqda...</p>
      ) : projects.length === 0 ? (
        <p className="text-neutral-500">Hali loyiha yo'q.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.ref}
              href={`/project/${p.ref}`}
              className="card transition hover:border-brand"
            >
              <div className="font-medium">{p.name}</div>
              <div className="mt-1 font-mono text-xs text-neutral-500">
                {p.ref}
              </div>
              <div className="mt-3 text-xs text-neutral-600">{p.db_name}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
