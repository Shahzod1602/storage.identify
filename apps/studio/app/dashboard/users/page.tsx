"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  RefreshCw,
  Shield,
  User as UserIcon,
} from "lucide-react";
import {
  getMe,
  listUsers,
  createUser,
  deleteUser,
  type PlatformUser,
} from "@/lib/api";
import { useRequireAuth } from "@/components/auth-guard";

export default function UsersPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "super_admin">("user");
  const [adding, setAdding] = useState(false);

  async function reload() {
    try {
      setUsers(await listUsers());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (!ready) return;
    getMe()
      .then((m) => {
        if (m.role !== "super_admin") router.replace("/dashboard");
        else void reload();
      })
      .catch(() => router.replace("/dashboard"));
  }, [ready, router]);

  async function add() {
    if (!email || !password) return;
    try {
      await createUser(email, password, role);
      setEmail("");
      setPassword("");
      setAdding(false);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(u: PlatformUser) {
    if (!confirm(`${u.email} o'chirilsinmi?`)) return;
    await deleteUser(u.id);
    await reload();
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-bg">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <Link href="/dashboard" className="btn-ghost">
            <ArrowLeft size={15} /> Loyihalar
          </Link>
          <span className="text-faint">/</span>
          <span className="font-medium">Foydalanuvchilar</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium">Foydalanuvchilar</h1>
            <p className="mt-1 text-sm text-muted">{users.length} ta</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-default" onClick={reload}>
              <RefreshCw size={14} /> Yangilash
            </button>
            <button className="btn" onClick={() => setAdding((v) => !v)}>
              <UserPlus size={14} /> Yangi user
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
            <div>
              <label className="mb-1 block text-xs text-faint">Role</label>
              <select
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value as "user" | "super_admin")}
              >
                <option value="user">user</option>
                <option value="super_admin">super_admin</option>
              </select>
            </div>
            <button className="btn" onClick={add}>
              Yaratish
            </button>
          </div>
        )}

        {error && (
          <div className="card mb-5 border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Yaratilgan</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-sans text-fg">{u.email}</td>
                  <td>
                    <span
                      className={`badge ${u.role === "super_admin" ? "badge-brand" : ""}`}
                    >
                      {u.role === "super_admin" ? (
                        <Shield size={11} />
                      ) : (
                        <UserIcon size={11} />
                      )}
                      {u.role}
                    </span>
                  </td>
                  <td className="text-muted">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {u.role !== "super_admin" && (
                      <button
                        className="btn-ghost btn-xs"
                        onClick={() => remove(u)}
                        title="O'chirish"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
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
