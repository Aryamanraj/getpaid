/**
 * Deterministic per-user accent for the monogram fallback: a flat tint pair
 * derived from the username, so every profile has its own identity with
 * nothing stored. Flat, not a gradient — a gradient circle is the one look
 * every AI-generated dashboard defaults to; a solid tint reads as a chosen
 * brand mark instead.
 */
export function userAccent(seed: string): { bg: string; fg: string } {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  return {
    bg: `oklch(94% 0.045 ${h})`,
    fg: `oklch(38% 0.13 ${h})`,
  };
}
