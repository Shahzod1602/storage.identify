import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3ecf8e", // Supabase yashili
          dark: "#249f63",
        },
        panel: "#1c1c1c",
        edge: "#2e2e2e",
      },
    },
  },
  plugins: [],
} satisfies Config;
