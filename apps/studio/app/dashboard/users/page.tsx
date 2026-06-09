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
import { toast, confirmDialog } from "@/components/feedback";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useT } from "@/lib/i18n/client";

export default function UsersPage() {
  const ready = useRequireAuth();
  const t = useT();
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

  // Email format tekshiruvi: @ va nuqtali domen shart, TLD kamida 2 harf (okk@gmail.c o'tmaydi).
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

  async function add() {
    const e = email.trim();
    if (!EMAIL_RE.test(e)) {
      setError(t.users.emailInvalidFull);
      return;
    }
    if (password.length < 6) {
      setError(t.users.min6Full);
      return;
    }
    try {
      await createUser(e, password, role);
      closeForm();
      toast.success(t.users.createdToast);
      await reload();
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message);
    }
  }

  async function remove(u: PlatformUser) {
    const ok = await confirmDialog({
      title: t.users.deleteTitle,
      message: t.users.deleteMsg(u.email),
      danger: true,
      confirmLabel: t.common.delete,
    });
    if (!ok) return;
    try {
      await deleteUser(u.id);
      toast.success(t.users.deleted);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-3">
          <Link href="/dashboard" className="btn-ghost">
            <ArrowLeft size={15} /> {t.shell.projects}
          </Link>
          <span className="text-faint">/</span>
          <span className="font-medium">{t.users.title}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {t.users.title}
            </h1>
            <p className="mt-1 text-sm text-secondary">
              {t.users.subtitle(users.length)}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-default" onClick={reload}>
              <RefreshCw size={14} /> {t.common.refresh}
            </button>
            <button
              className="btn"
              onClick={() => (adding ? closeForm() : setAdding(true))}
            >
              <UserPlus size={14} /> {t.users.newUser}
            </button>
          </div>
        </div>

        {adding && (
          <div className="card mb-5 animate-fade-in flex flex-wrap items-start gap-3 p-4">
            <div className="min-w-[200px] flex-1">
              <label className="label">{t.users.email}</label>
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
                  {t.users.emailInvalid}
                </p>
              )}
            </div>
            <div className="min-w-[160px] flex-1">
              <label className="label">{t.users.password}</label>
              <input
                className="input"
                type="password"
                placeholder={t.users.min6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
              />
              {password.length > 0 && password.length < 6 && (
                <p className="mt-1.5 text-xs text-danger">{t.users.min6}</p>
              )}
            </div>
            <div>
              <label className="label">{t.users.role}</label>
              <select
                className="input"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "user" | "super_admin")
                }
              >
                <option value="user">{t.users.roleUser}</option>
                <option value="super_admin">{t.users.roleSuper}</option>
              </select>
            </div>
            <div className="flex items-center gap-2 self-end pb-0.5">
              <button
                className="btn"
                onClick={add}
                disabled={!EMAIL_RE.test(email.trim()) || password.length < 6}
              >
                {t.users.create}
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
                <th className="w-full">{t.users.email}</th>
                <th className="whitespace-nowrap">{t.users.role}</th>
                <th className="whitespace-nowrap">{t.users.createdAt}</th>
                <th className="whitespace-nowrap !text-right">{t.users.actions}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="!py-12 text-center text-faint">
                    {t.users.noUsers}
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
