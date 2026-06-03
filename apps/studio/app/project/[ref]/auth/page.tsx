"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/components/project-context";
import { metaQuery } from "@/lib/api";
import { RowsTable } from "@/components/rows-table";

export default function AuthPage() {
  const { ref, keys } = useProject();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    if (!keys) return;
    try {
      setRows(
        await metaQuery(
          ref,
          keys.service_key,
          `select id, email, email_confirmed_at, created_at
           from auth.users order by created_at desc limit 100`,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Auth — foydalanuvchilar</h1>
        <button className="btn-ghost" onClick={reload}>
          ↻ yangilash
        </button>
      </div>
      <p className="text-sm text-neutral-500">
        Foydalanuvchilar <code className="kbd">/auth/v1/signup</code> orqali
        qo'shiladi.
      </p>
      {error && <div className="card text-red-400">{error}</div>}
      <RowsTable rows={rows} />
    </div>
  );
}
