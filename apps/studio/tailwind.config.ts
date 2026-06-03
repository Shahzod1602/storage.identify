import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        bg: "#181818",
        surface: "#1c1c1c",
        panel: "#1f1f1f",
        hover: "#262626",
        border: "#2a2a2a",
        "border-strong": "#363636",
        fg: "#ededed",
        muted: "#a0a0a0",
        faint: "#707070",
        brand: {
          DEFAULT: "#3ecf8e",
          600: "#24b873",
          700: "#1c8a57",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
