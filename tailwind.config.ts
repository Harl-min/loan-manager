import type { Config } from "tailwindcss";

// ---------------------------------------------------------------------------
// THEMING STRATEGY
// Every brand-sensitive color below reads from a CSS custom property
// (defined in app/globals.css and set at runtime from lib/brand.ts / env
// vars). Components use ordinary Tailwind classes like `bg-primary` or
// `text-accent` — to re-brand the whole app later you only ever edit the
// CSS variable values (or the NEXT_PUBLIC_BRAND_* env vars). Nothing in
// this config file, and no component class name, ever needs to change.
// ---------------------------------------------------------------------------
const withOpacity = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: withOpacity("--color-background"),
        surface: withOpacity("--color-surface"),
        border: withOpacity("--color-border"),
        muted: withOpacity("--color-muted"),
        foreground: withOpacity("--color-foreground"),
        primary: {
          DEFAULT: withOpacity("--color-primary"),
          foreground: withOpacity("--color-primary-foreground"),
        },
        accent: {
          DEFAULT: withOpacity("--color-accent"),
          foreground: withOpacity("--color-accent-foreground"),
        },
        hover: withOpacity("--color-hover"),
        success: withOpacity("--color-success"),
        warning: withOpacity("--color-warning"),
        danger: withOpacity("--color-danger"),
      },
      borderRadius: {
        brand: "var(--radius)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
    },
  },
  plugins: [],
};

export default config;
