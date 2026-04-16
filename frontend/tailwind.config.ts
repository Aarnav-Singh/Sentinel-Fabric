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
          bg:              'rgb(var(--sf-bg) / <alpha-value>)',
          surface:         'rgb(var(--sf-surface) / <alpha-value>)',
          'surface-2':     'rgb(var(--sf-surface-2) / <alpha-value>)',
          border:          'rgb(var(--sf-border) / <alpha-value>)',
          'border-active': 'rgb(var(--sf-border-active) / <alpha-value>)',
          accent:          'rgb(var(--sf-accent) / <alpha-value>)',
          'accent-2':      'rgb(var(--sf-accent-2) / <alpha-value>)',
          text:            'rgb(var(--sf-text) / <alpha-value>)',
          muted:           'rgb(var(--sf-muted) / <alpha-value>)',
          critical:        'rgb(var(--sf-critical) / <alpha-value>)',
          warning:         'rgb(var(--sf-warning) / <alpha-value>)',
          safe:            'rgb(var(--sf-safe) / <alpha-value>)',
          disabled:        'rgb(var(--sf-disabled) / <alpha-value>)',
        },
      },
      borderColor: {
        sf: "rgb(var(--sf-border))",
        "sf-active": "rgb(var(--sf-border-active))",
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
        'threat-pulse':   'threat-pulse var(--pulse-rate, 2s) ease-in-out infinite',
        'incident-sweep': 'incident-sweep 4s linear infinite',
        'ambient-drift':  'ambient-drift 20s ease-in-out infinite alternate',
        'state-in':       'state-in 0.8s ease-out both',
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
        'threat-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 var(--sf-accent-glow, transparent)' },
          '50%':       { boxShadow: '0 0 0 8px transparent' },
        },
        'incident-sweep': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        'ambient-drift': {
          '0%':   { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(8px, 8px)' },
        },
        'state-in': {
          from: { opacity: '0', transform: 'translateY(-4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
