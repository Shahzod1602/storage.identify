"use client";

import { useEffect, useState } from "react";
import { UserPlus, RefreshCw, Mail, X, Check, Ban, Trash2 } from "lucide-react";
import { useProject } from "@/components/project-context";
import { metaQuery, GATEWAY } from "@/lib/api";
import { toast, confirmDialog } from "@/components/feedback";
import { useT } from "@/lib/i18n/client";

interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  banned_until: string | null;
  created_at: string;
}

export default function AuthPage() {
  const { ref, keys } = useProject();
  const t = useT();
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
  }, [ref, keys?.service_key]);

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
      const msg = (await res.json().catch(() => ({}))).error ?? "Xato";
      setError(msg);
      toast.error(msg);
      return;
    }
    setEmail("");
    setPassword("");
    setAdding(false);
    toast.success(t.authPage.added);
    await reload();
  }

  async function toggleBan(u: AuthUser) {
    if (!keys) return;
    const res = await fetch(adminUrl(u.id), {
      method: "PUT",
      headers: { apikey: keys.service_key, "content-type": "application/json" },
      body: JSON.stringify({ banned: !u.banned_until }),
    });
    if (!res.ok) {
      toast.error(t.authPage.actionFail);
      return;
    }
    toast.success(u.banned_until ? t.authPage.unbannedToast : t.authPage.bannedToast);
    await reload();
  }

  async function deleteUser(u: AuthUser) {
    if (!keys) return;
    const ok = await confirmDialog({
      title: t.authPage.deleteTitle,
      message: t.authPage.deleteMsg(u.email),
      danger: true,
      confirmLabel: t.common.delete,
    });
    if (!ok) return;
    const res = await fetch(adminUrl(u.id), {
      method: "DELETE",
      headers: { apikey: keys.service_key },
    });
    if (!res.ok) {
      toast.error(t.authPage.actionFail);
      return;
    }
    toast.success(t.authPage.deleted);
    await reload();
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-5xl px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium">{t.authPage.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {t.authPage.subtitle(users.length)}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-default" onClick={reload}>
              <RefreshCw size={14} /> {t.common.refresh}
            </button>
            <button className="btn" onClick={() => setAdding((v) => !v)}>
              <UserPlus size={14} /> {t.authPage.addUser}
            </button>
          </div>
        </div>

        {adding && (
          <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-faint">{t.authPage.email}</label>
              <input
                className="input"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-faint">{t.authPage.password}</label>
              <input
                className="input"
                type="password"
                placeholder="kamida 6 belgi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn" onClick={addUser}>
              {t.authPage.create}
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
                <th>{t.authPage.uid}</th>
                <th>{t.authPage.email}</th>
                <th>{t.authPage.status}</th>
                <th>{t.authPage.confirmed}</th>
                <th>{t.authPage.createdAt}</th>
                <th>{t.authPage.actions}</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-faint">
                    {t.authPage.noUsers}
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
                      <span className="badge badge-danger">{t.authPage.banned}</span>
                    ) : (
                      <span className="badge badge-brand">{t.authPage.active}</span>
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
                        title={u.banned_until ? t.authPage.unban : t.authPage.ban}
                        onClick={() => toggleBan(u)}
                      >
                        <Ban size={13} className={u.banned_until ? "text-danger" : ""} />
                      </button>
                      <button
                        className="btn-ghost btn-xs"
                        title={t.common.delete}
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
