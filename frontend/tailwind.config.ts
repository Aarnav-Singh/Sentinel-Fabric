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
          bg: "#101317",
          surface: "#15191e",
          "surface-raised": "#1b2026",
          card: "#121519",
          accent: "#14b8a6",
          "accent-2": "#06b6d4",
          critical: "#ef4444",
          warning: "#f97316",
          safe: "#10b981",
          data: "#2dd4bf",
          muted: "#94a3b8",
          text: "#f8fafc",
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
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        "sf-blink": "sf-blink 1s infinite",
        "sf-fadeIn": "sf-fadeIn 0.3s ease both",
        "sf-pulse": "sf-pulse 2s infinite",
        "sf-pulse-red": "sf-pulse-red 2s infinite",
      },
      keyframes: {
        "sf-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "sf-fadeIn": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "sf-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(20, 184, 166, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(20, 184, 166, 0)" },
        },
        "sf-pulse-red": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 45, 85, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(255, 45, 85, 0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
