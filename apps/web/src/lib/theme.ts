import type { DomainTheme } from '@recv/shared';

const TOKEN_NAMES: Record<string, string> = {
  background: '--color-background',
  surface: '--color-surface',
  foreground: '--color-foreground',
  muted: '--color-muted',
  border: '--color-border',
  accent: '--color-accent',
  accentForeground: '--color-accent-foreground',
};

/**
 * Domains.ThemeConfig arrives as data and leaves as CSS custom properties.
 * No component holds a hex value, which is what makes a new domain a DB row
 * rather than a deploy.
 */
export function themeToCssVars(theme: DomainTheme = {}): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(theme.colors ?? {})) {
    const token = TOKEN_NAMES[key];
    // Only known tokens, and only colour-safe characters — ThemeConfig is
    // admin-editable and lands inside a <style> tag.
    if (token && /^[#a-zA-Z0-9(),.%\s-]+$/.test(value)) {
      lines.push(`  ${token}: ${value};`);
    }
  }

  if (theme.radius && /^[0-9.]+(rem|px|em)$/.test(theme.radius)) {
    lines.push(`  --radius: ${theme.radius};`);
  }

  return lines.length ? `:root {\n${lines.join('\n')}\n}` : '';
}
