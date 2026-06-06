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
  X,
} from "lucide-react";
import {
  getMe,
  listUsers,
  createUser,
  deleteUser,
  type PlatformUser,
} from "@/lib/api";
import { useRequireAuth } from "@/components/auth-guard";
import { ThemeToggle } from "@/components/theme-toggle";

export default function UsersPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "super_admin">("user");
  const [adding, setAdding] = useState(false);

  // Forma'ni tozalab yopadi (Bekor / muvaffaqiyatli yaratish).
  function closeForm() {
    setEmail("");
    setPassword("");
    setRole("user");
    setError(null);
    setAdding(false);
  }

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

  // Email format tekshiruvi: @ va keyin nuqtali domen shart (okk@gmail / sdfsdf o'tmaydi).
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function add() {
    const e = email.trim();
    if (!EMAIL_RE.test(e)) {
      setError("Email manzili noto'g'ri (masalan: user@example.com)");
      return;
    }
    if (password.length < 6) {
      setError("Parol kamida 6 belgi bo'lishi kerak");
      return;
    }
    try {
      await createUser(e, password, role);
      closeForm();
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(u: PlatformUser) {
    if (!confirm(`${u.email} o'chirilsinmi?`)) return;
    await deleteUser(u.id);
    await reload();
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <Link href="/dashboard" className="btn-ghost">
            <ArrowLeft size={15} /> Loyihalar
          </Link>
          <span className="text-faint">/</span>
          <span className="font-medium">Foydalanuvchilar</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Foydalanuvchilar
            </h1>
            <p className="mt-1 text-sm text-secondary">
              {users.length} ta · platforma kirish huquqi (RBAC)
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-default" onClick={reload}>
              <RefreshCw size={14} /> Yangilash
            </button>
            <button
              className="btn"
              onClick={() => (adding ? closeForm() : setAdding(true))}
            >
              <UserPlus size={14} /> Yangi user
            </button>
          </div>
        </div>

        {adding && (
          <div className="card mb-5 animate-fade-in flex flex-wrap items-start gap-3 p-4">
            <div className="min-w-[200px] flex-1">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
              />
              {email.length > 0 && !EMAIL_RE.test(email.trim()) && (
                <p className="mt-1.5 text-xs text-danger">
                  Email manzili noto'g'ri
                </p>
              )}
            </div>
            <div className="min-w-[160px] flex-1">
              <label className="label">Parol</label>
              <input
                className="input"
                type="password"
                placeholder="kamida 6 belgi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
              />
              {password.length > 0 && password.length < 6 && (
                <p className="mt-1.5 text-xs text-danger">Kamida 6 belgi</p>
              )}
            </div>
            <div>
              <label className="label">Rol</label>
              <select
                className="input"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "user" | "super_admin")
                }
              >
                <option value="user">user</option>
                <option value="super_admin">super_admin</option>
              </select>
            </div>
            <div className="flex items-center gap-2 self-end pb-0.5">
              <button
                className="btn"
                onClick={add}
                disabled={!EMAIL_RE.test(email.trim()) || password.length < 6}
              >
                Yaratish
              </button>
              <button className="btn-ghost !px-1.5" onClick={closeForm}>
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {error && <div className="alert-danger mb-5">{error}</div>}

        <div className="grid-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th className="w-full">Email</th>
                <th className="whitespace-nowrap">Rol</th>
                <th className="whitespace-nowrap">Yaratilgan</th>
                <th className="whitespace-nowrap !text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="!py-12 text-center text-faint">
                    Foydalanuvchi yo'q
                  </td>
                </tr>
              )}
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
                  <td className="text-right">
                    {u.role !== "super_admin" && (
                      <button
                        className="btn-ghost btn-xs text-faint hover:text-danger"
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
