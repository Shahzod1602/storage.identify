"use client";

import { useEffect, useState } from "react";
import { UserPlus, RefreshCw, Mail, X, Check, Ban, Trash2 } from "lucide-react";
import { useProject } from "@/components/project-context";
import { metaQuery, GATEWAY } from "@/lib/api";

interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  banned_until: string | null;
  created_at: string;
}

export default function AuthPage() {
  const { ref, keys } = useProject();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function reload() {
    if (!keys) return;
    try {
      const r = await metaQuery(
        ref,
        keys.service_key,
        `select id, email, email_confirmed_at, banned_until, created_at
         from auth.users order by created_at desc limit 200`,
      );
      setUsers(r as unknown as AuthUser[]);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void reload();
  }, [ref, keys]);

  function adminUrl(id = ""): string {
    return `${GATEWAY}/v1/${ref}/auth/v1/admin/users${id ? "/" + id : ""}`;
  }

  async function addUser() {
    if (!keys || !email || !password) return;
    // Admin yaratish -> avtomatik tasdiqlangan
    const res = await fetch(adminUrl(), {
      method: "POST",
      headers: { apikey: keys.service_key, "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Xato");
      return;
    }
    setEmail("");
    setPassword("");
    setAdding(false);
    await reload();
  }

  async function toggleBan(u: AuthUser) {
    if (!keys) return;
    await fetch(adminUrl(u.id), {
      method: "PUT",
      headers: { apikey: keys.service_key, "content-type": "application/json" },
      body: JSON.stringify({ banned: !u.banned_until }),
    });
    await reload();
  }

  async function deleteUser(u: AuthUser) {
    if (!keys || !confirm(`${u.email} o'chirilsinmi?`)) return;
    await fetch(adminUrl(u.id), {
      method: "DELETE",
      headers: { apikey: keys.service_key },
    });
    await reload();
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-5xl px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium">Authentication</h1>
            <p className="mt-1 text-sm text-muted">
              {users.length} foydalanuvchi
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-default" onClick={reload}>
              <RefreshCw size={14} /> Yangilash
            </button>
            <button className="btn" onClick={() => setAdding((v) => !v)}>
              <UserPlus size={14} /> Foydalanuvchi qo'shish
            </button>
          </div>
        </div>

        {adding && (
          <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-faint">Email</label>
              <input
                className="input"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-faint">Parol</label>
              <input
                className="input"
                type="password"
                placeholder="kamida 6 belgi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn" onClick={addUser}>
              Yaratish
            </button>
            <button className="btn-ghost" onClick={() => setAdding(false)}>
              <X size={15} />
            </button>
          </div>
        )}

        {error && <div className="alert-danger mb-5">{error}</div>}

        <div className="grid-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>UID</th>
                <th>Email</th>
                <th>Holat</th>
                <th>Tasdiqlangan</th>
                <th>Yaratilgan</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-faint">
                    Foydalanuvchi yo'q
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="text-faint">{u.id.slice(0, 8)}…</td>
                  <td className="font-sans text-fg">
                    <span className="flex items-center gap-2">
                      <Mail size={13} className="text-faint" />
                      {u.email}
                    </span>
                  </td>
                  <td>
                    {u.banned_until ? (
                      <span className="badge badge-danger">bloklangan</span>
                    ) : (
                      <span className="badge badge-brand">faol</span>
                    )}
                  </td>
                  <td>
                    {u.email_confirmed_at ? (
                      <Check size={14} className="text-brand" />
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="text-muted">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        className="btn-ghost btn-xs"
                        title={u.banned_until ? "Blokdan chiqarish" : "Bloklash"}
                        onClick={() => toggleBan(u)}
                      >
                        <Ban size={13} className={u.banned_until ? "text-danger" : ""} />
                      </button>
                      <button
                        className="btn-ghost btn-xs"
                        title="O'chirish"
                        onClick={() => deleteUser(u)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
