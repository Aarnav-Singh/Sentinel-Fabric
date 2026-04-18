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
        ng: {
          base:           'rgb(var(--ng-base) / <alpha-value>)',
          low:            'rgb(var(--ng-low) / <alpha-value>)',
          mid:            'rgb(var(--ng-mid) / <alpha-value>)',
          high:           'rgb(var(--ng-high) / <alpha-value>)',
          highest:        'rgb(var(--ng-highest) / <alpha-value>)',
          cyan:           'rgb(var(--ng-cyan) / <alpha-value>)',
          'cyan-bright':  'rgb(var(--ng-cyan-bright) / <alpha-value>)',
          magenta:        'rgb(var(--ng-magenta) / <alpha-value>)',
          lime:           'rgb(var(--ng-lime) / <alpha-value>)',
          error:          'rgb(var(--ng-error) / <alpha-value>)',
          on:             'rgb(var(--ng-on) / <alpha-value>)',
          muted:          'rgb(var(--ng-muted) / <alpha-value>)',
          outline:        'rgb(var(--ng-outline) / <alpha-value>)',
          'outline-dim':  'rgb(var(--ng-outline-dim) / <alpha-value>)',
        },
      },
      borderRadius: {
        none: '0px', DEFAULT: '0px', sm: '0px', md: '0px',
        lg: '0px', xl: '0px', '2xl': '0px', full: '9999px',
      },
      fontFamily: {
        sans:     ['var(--font-inter)', 'sans-serif'],
        mono:     ['var(--font-jetbrains-mono)', 'monospace'],
        headline: ['var(--font-space-grotesk)', 'sans-serif'],
        display:  ['var(--font-space-grotesk)', 'sans-serif'],
      },
      transitionDuration: {
        "sf-fast": "150ms",
        "sf-base": "250ms",
        "sf-moderate": "400ms",
      },
      backgroundImage: {},
      backdropBlur: {},
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
