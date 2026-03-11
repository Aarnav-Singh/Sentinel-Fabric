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
        brand: {
          navy: "#0F1E2E",
          navyHover: "#162C43",
          orange: "#F97316",
          orangeHover: "#FB923C",
          dark: "#0a0f18",       // Stitch: dark background
          surface: "#0d1421",    // Stitch: surface background
          card: "#111927",       // Stitch: card background
          border: "#1f2937",     // Stitch: border color
          accent: "#00f2ff",     // Stitch: Glowing Cyan
          critical: "#f43f5e",   // Stitch: critical red
          high: "#fb923c",       // Stitch: high warning orange
          medium: "#fbbf24",     // Stitch: medium warning amber
          success: "#10b981",    // Stitch: success green
        },
        surface: {
          elevated: "rgba(15, 30, 46, 0.4)",
          panel: "#121A24",
          card: "#18222E",
          border: "rgba(255, 255, 255, 0.08)",
        },
        text: {
          primary: "#F8FAFC",
          secondary: "#94A3B8",
          muted: "#475569",
        },
        // ── Sentinel Fabric Cyber-Ops Palette ──
        sf: {
          bg: "#0a0f18",            // Updated to match brand.dark
          surface: "#0d1421",       // Updated to match brand.surface
          "surface-alt": "#111927", // Updated to match brand.card
          border: "#1f2937",        // Updated to match brand.border
          "border-bright": "#374151",
          teal: "#00f2ff",          // Updated to match Glowing Cyan
          "teal-dim": "#00a8b3",
          red: "#f43f5e",
          "red-dim": "#be123c",
          amber: "#fbbf24",
          green: "#10b981",
          purple: "#b57aff",
          "text-primary": "#f8fafc",
          "text-secondary": "#94a3b8",
          "text-muted": "#475569",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "sans-serif"],
        display: ["var(--font-sora)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
        condensed: ["var(--font-barlow-condensed)", "'Barlow Condensed'", "sans-serif"],
        space: ["var(--font-space-mono)", "'Space Mono'", "monospace"],
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
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0, 212, 200, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(0, 212, 200, 0)" },
        },
        "sf-pulse-red": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 63, 91, 0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(255, 63, 91, 0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
