/**
 * Deterministic per-user accent. The hue is a pure function of the username,
 * so every profile gets its own colour with nothing stored and nothing
 * hardcoded — the domain theme still owns every other colour on the page.
 */
export function userGradient(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  const h2 = (h + 45) % 360;
  return `linear-gradient(135deg, oklch(65% 0.13 ${h}), oklch(48% 0.15 ${h2}))`;
}
