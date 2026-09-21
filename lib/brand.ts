export const brand = {
  name: "BOI",
  tagline: "Loan Servicing",

  colors: {
    background: "255 255 255",
    surface: "255 255 255",
    border: "228 228 231",
    muted: "113 113 122",

    foreground: "0 0 0",
    primary: "17 104 51",
    primaryForeground: "255 255 255",

    accent: "16 185 129",
    accentForeground: "255 255 255",

    hover: "149 193 31",
    success: "16 185 129",
    warning: "217 119 6",
    danger: "227 0 15",
  },

  logo: "/assets/images/BOI_Logo.png",

  radius: "0.75rem",

  font: {
    sans: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
  },
} as const;

/**
 * Generates the CSS variables used throughout the application.
 */
export function brandCssVariables(): string {
  const { colors: c } = brand;

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
    --color-hover: ${c.hover};
    --color-success: ${c.success};
    --color-warning: ${c.warning};
    --color-danger: ${c.danger};

    --radius: ${brand.radius};
    --font-sans: ${brand.font.sans};
  `.trim();
}