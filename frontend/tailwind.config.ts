import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sf: {
          bg: "#0a0a0c",
          surface: "#111115",
          "surface-raised": "#15151a",
          card: "#111115",
          accent: "#0d9488",
          "accent-2": "#475569",
          critical: "#dc2626",
          warning: "#d97706",
          safe: "#059669",
          data: "#0d9488",
          muted: "#64748b",
          text: "#e2e8f0",
        },
      },
      borderColor: {
        sf: "var(--sf-border)",
        "sf-active": "var(--sf-border-active)",
      },
      transitionDuration: {
        "sf-fast": "150ms",
        "sf-base": "250ms",
        "sf-moderate": "400ms",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-sora)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      backgroundImage: {},
      backdropBlur: {},
      boxShadow: {
        "sf-panel": "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)",
        "sf-glow-accent": "0 0 10px rgba(13, 148, 136, 0.2)",
        "sf-glow-critical": "0 0 10px rgba(220, 38, 38, 0.25)",
      },
      animation: {
        "sf-blink": "sf-blink 1s infinite steps(2)",
        "sf-fadeIn": "sf-fadeIn 0.2s ease-out both",
        "sf-pulse": "sf-pulse 2s infinite ease-out",
        "sf-pulse-red": "sf-pulse-red 2s infinite ease-out",
        "sf-shimmer": "sf-shimmer-sweep 2s linear infinite",
      },
      keyframes: {
        "sf-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "sf-fadeIn": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "sf-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(13, 148, 136, 0.4)" },
          "50%": { boxShadow: "0 0 0 6px rgba(13, 148, 136, 0)" },
        },
        "sf-pulse-red": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(220, 38, 38, 0.4)" },
          "50%": { boxShadow: "0 0 0 6px rgba(220, 38, 38, 0)" },
        },
        "sf-shimmer-sweep": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
