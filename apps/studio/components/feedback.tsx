"use client";

import {
  useEffect,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { Check, X, AlertTriangle, Info, Loader2 } from "lucide-react";

/* ════════════════════════ Toast ════════════════════════ */

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

let toasts: ToastItem[] = [];
let toastListeners: Array<() => void> = [];
let toastId = 1;

function emitToasts() {
  for (const l of toastListeners) l();
}
function pushToast(kind: ToastKind, message: string) {
  const id = toastId++;
  toasts = [...toasts, { id, kind, message }];
  emitToasts();
  setTimeout(() => dismissToast(id), 4200);
}
function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emitToasts();
}

/** Istalgan joydan chaqiriladi: toast.success("..."), toast.error("...") */
export const toast = {
  success: (m: string) => pushToast("success", m),
  error: (m: string) => pushToast("error", m),
  info: (m: string) => pushToast("info", m),
};

const TOAST_ICON = {
  success: <Check size={15} className="text-brand" />,
  error: <AlertTriangle size={15} className="text-danger" />,
  info: <Info size={15} className="text-secondary" />,
};

export function Toaster() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    toastListeners.push(force);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== force);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex animate-fade-in items-start gap-2.5 rounded-xl border border-border bg-panel px-3.5 py-3 shadow-pop"
        >
          <span className="mt-0.5 shrink-0">{TOAST_ICON[t.kind]}</span>
          <span className="flex-1 text-[13px] leading-snug text-fg">
            {t.message}
          </span>
          <button
            onClick={() => dismissToast(t.id)}
            className="shrink-0 text-faint transition hover:text-fg"
            aria-label="Yopish"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════ Confirm ════════════════════════ */

interface ConfirmOpts {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}
interface ConfirmState extends ConfirmOpts {
  resolve: (v: boolean) => void;
}

let confirmState: ConfirmState | null = null;
let confirmListeners: Array<() => void> = [];
function emitConfirm() {
  for (const l of confirmListeners) l();
}

/** await confirmDialog({ title, message, danger }) -> Promise<boolean> */
export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState = { ...opts, resolve };
    emitConfirm();
  });
}
function settleConfirm(v: boolean) {
  confirmState?.resolve(v);
  confirmState = null;
  emitConfirm();
}

export function ConfirmHost() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    confirmListeners.push(force);
    return () => {
      confirmListeners = confirmListeners.filter((l) => l !== force);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!confirmState) return;
      if (e.key === "Escape") settleConfirm(false);
      if (e.key === "Enter") settleConfirm(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!confirmState) return null;
  const s = confirmState;
  return (
    <Overlay onClose={() => settleConfirm(false)}>
      <h2 className="text-base font-semibold tracking-tight">{s.title}</h2>
      {s.message && (
        <p className="mt-2 text-[13px] leading-relaxed text-secondary">
          {s.message}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-default" onClick={() => settleConfirm(false)}>
          {s.cancelLabel ?? "Bekor"}
        </button>
        <button
          className={s.danger ? "btn-danger" : "btn"}
          onClick={() => settleConfirm(true)}
          autoFocus
        >
          {s.confirmLabel ?? "Tasdiqlash"}
        </button>
      </div>
    </Overlay>
  );
}

/* ════════════════════════ Prompt ════════════════════════ */

interface PromptOpts {
  title: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  /** Qo'shimcha belgilash (masalan "Ommaviy bucket"). */
  toggleLabel?: string;
}
interface PromptState extends PromptOpts {
  resolve: (v: { value: string; toggle: boolean } | null) => void;
}

let promptState: PromptState | null = null;
let promptListeners: Array<() => void> = [];
function emitPrompt() {
  for (const l of promptListeners) l();
}

/** await promptDialog({ title, label }) -> { value, toggle } | null (bekor) */
export function promptDialog(
  opts: PromptOpts,
): Promise<{ value: string; toggle: boolean } | null> {
  return new Promise((resolve) => {
    promptState = { ...opts, resolve };
    emitPrompt();
  });
}
function settlePrompt(v: { value: string; toggle: boolean } | null) {
  promptState?.resolve(v);
  promptState = null;
  emitPrompt();
}

export function PromptHost() {
  const [, force] = useReducer((x) => x + 1, 0);
  const [value, setValue] = useState("");
  const [toggle, setToggle] = useState(false);
  useEffect(() => {
    promptListeners.push(force);
    return () => {
      promptListeners = promptListeners.filter((l) => l !== force);
    };
  }, []);
  // Har ochilganda boshlang'ich qiymatlarni o'rnatamiz.
  useEffect(() => {
    if (promptState) {
      setValue(promptState.defaultValue ?? "");
      setToggle(false);
    }
  }, [promptState]);

  if (!promptState) return null;
  const s = promptState;
  const submit = () => {
    if (!value.trim()) return;
    settlePrompt({ value: value.trim(), toggle });
  };
  return (
    <Overlay onClose={() => settlePrompt(null)}>
      <h2 className="text-base font-semibold tracking-tight">{s.title}</h2>
      <div className="mt-4">
        {s.label && <label className="label">{s.label}</label>}
        <input
          autoFocus
          className="input"
          value={value}
          placeholder={s.placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") settlePrompt(null);
          }}
        />
      </div>
      {s.toggleLabel && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-[13px] text-secondary">
          <input
            type="checkbox"
            checked={toggle}
            onChange={(e) => setToggle(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          {s.toggleLabel}
        </label>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <button className="btn-default" onClick={() => settlePrompt(null)}>
          Bekor
        </button>
        <button className="btn" onClick={submit} disabled={!value.trim()}>
          {s.confirmLabel ?? "Yaratish"}
        </button>
      </div>
    </Overlay>
  );
}

/* ════════════════════════ Umumiy ════════════════════════ */

function Overlay({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm animate-fade-in rounded-xl border border-border bg-panel p-5 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

/** Barcha host'larni bitta joyda mount qiladi (root layout uchun). */
export function FeedbackHosts() {
  return (
    <>
      <Toaster />
      <ConfirmHost />
      <PromptHost />
    </>
  );
}

/* ════════════════════════ Clipboard ════════════════════════ */

/** Xavfsiz nusxa olish — HTTP/LAN'da ham ishlaydi (execCommand fallback). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback'ga o'tamiz */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
