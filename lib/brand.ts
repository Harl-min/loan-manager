// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH FOR WHITE-LABEL BRANDING
//
// To re-skin this app for a different brand later, you only need to change
// the NEXT_PUBLIC_BRAND_* environment variables (see .env.example) — no
// component code and no Tailwind classes need to change. Colors are plain
// "R G B" triples (no commas, no `rgb()`) because Tailwind interpolates
// them into `rgb(var(--x) / <alpha-value>)` so opacity utilities keep working.
// ---------------------------------------------------------------------------

export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "Neptune",
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE ?? "Loan Servicing",
  colors: {
    background: "255 255 255",
    surface: "255 255 255",
    border: "228 228 231",
    muted: "113 113 122",
    foreground: "24 24 27",
    primary: process.env.NEXT_PUBLIC_BRAND_PRIMARY ?? "17 17 17",
    primaryForeground: process.env.NEXT_PUBLIC_BRAND_PRIMARY_FOREGROUND ?? "255 255 255",
    accent: process.env.NEXT_PUBLIC_BRAND_ACCENT ?? "16 185 129",
    accentForeground: "255 255 255",
    success: "16 185 129",
    warning: "217 119 6",
    danger: "220 38 38",
  },
  logo: "/assets/images/Neptunedarklogo.png",
  radius: "0.75rem",
} as const;

/** CSS custom properties derived from `brand`, injected once in the root layout. */
export function brandCssVariables(): string {
  const c = brand.colors;
  return `
    --color-background: ${c.background};
    --color-surface: ${c.surface};
    --color-border: ${c.border};
    --color-muted: ${c.muted};
    --color-foreground: ${c.foreground};
    --color-primary: ${c.primary};
    --color-primary-foreground: ${c.primaryForeground};
    --color-accent: ${c.accent};
    --color-accent-foreground: ${c.accentForeground};
    --color-success: ${c.success};
    --color-warning: ${c.warning};
    --color-danger: ${c.danger};
    --radius: ${brand.radius};
    --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  `.trim();
}
