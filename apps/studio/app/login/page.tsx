"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Loader2 } from "lucide-react";
import { login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(password);
      router.replace("/dashboard");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 font-semibold"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand text-sm font-bold text-black">
            s
          </span>
          storagedb
        </Link>

        <div className="card p-6">
          <h1 className="text-lg font-medium">Dashboard'ga kirish</h1>
          <p className="mt-1 text-sm text-muted">Admin parolini kiriting</p>

          <div className="mt-5">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs text-faint">
              <Lock size={12} /> Parol
            </label>
            <input
              className="input"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            className="btn mt-5 w-full justify-center"
            onClick={submit}
            disabled={busy}
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : "Kirish"}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-faint">
          Parol = server <code className="kbd">PLATFORM_ADMIN_TOKEN</code>
        </p>
      </div>
    </div>
  );
}
