import type { Config } from "tailwindcss";

/**
 * Ranglar CSS o'zgaruvchilari (RGB kanal) orqali beriladi — shu sabab
 * `bg-surface`, `text-muted`, `bg-brand/15` kabi mavjud klaslar light va dark
 * mavzularda avtomatik ishlaydi. Mavzu `.dark` klasi bilan almashtiriladi.
 */
export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        card: "rgb(var(--panel) / <alpha-value>)",
        hover: "rgb(var(--hover) / <alpha-value>)",
        border: {
          DEFAULT: "rgb(var(--border) / <alpha-value>)",
          strong: "rgb(var(--border-strong) / <alpha-value>)",
        },
        fg: "rgb(var(--fg) / <alpha-value>)",
        secondary: "rgb(var(--secondary) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        faint: "rgb(var(--faint) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          fg: "rgb(var(--brand-fg) / <alpha-value>)",
          600: "rgb(var(--brand-600) / <alpha-value>)",
          700: "rgb(var(--brand-700) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--danger) / <alpha-value>)",
          fg: "rgb(var(--danger-fg) / <alpha-value>)",
        },
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s cubic-bezier(.4,0,.2,1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
