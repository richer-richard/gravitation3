import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#000000",
        surface: "rgba(255, 255, 255, 0.03)",
        "surface-hover": "rgba(255, 255, 255, 0.06)",
        "surface-active": "rgba(255, 255, 255, 0.09)",
        border: "rgba(255, 255, 255, 0.08)",
        "border-active": "rgba(255, 255, 255, 0.15)",
        "text-primary": "rgba(255, 255, 255, 0.87)",
        "text-secondary": "rgba(255, 255, 255, 0.50)",
        "text-tertiary": "rgba(255, 255, 255, 0.28)",
        phase: "#5bf0d8",
        energy: "#f857a6",
        time: "#a78bfa",
        stability: "#34d399",
        chaos: "#f97316",
        field: "#38bdf8",
      },
      fontFamily: {
        sans: ['"Space"', "system-ui", "-apple-system", "sans-serif"],
        mono: ['"Sono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": "0.6875rem", // 11px
        xs: "0.8125rem", // 13px
        sm: "0.875rem", // 14px
      },
      backdropBlur: {
        glass: "24px",
      },
      borderRadius: {
        panel: "12px",
        control: "6px",
        input: "2px",
      },
    },
  },
  plugins: [],
} satisfies Config;
