"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/** Light/Dark mavzu almashtirgich. Tanlov localStorage'da saqlanadi. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    const el = document.documentElement;
    el.classList.toggle("dark", next);
    el.style.colorScheme = next ? "dark" : "light";
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* localStorage yo'q — e'tiborsiz */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label="Mavzuni almashtirish"
      title={dark ? "Yorug' rejim" : "Tungi rejim"}
      className={`btn-ghost !px-2 ${className}`}
    >
      {/* mount'gacha ikonani yashiramiz — hydration nomuvofiqligi bo'lmasin */}
      <span className={mounted ? "" : "opacity-0"}>
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </span>
    </button>
  );
}
