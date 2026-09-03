/**
 * Per-payee accent. One hue drives every accent on their page — monogram
 * tint, amount caret, selected states, the pay button — with lightness and
 * chroma fixed by us, so no choice can break contrast or look garish. The
 * payee picks the hue in their dashboard; unset falls back to a hue derived
 * from the username, so every page has an identity from day one.
 */

export function hueFromSeed(seed: string): number {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export interface Accent {
  hue: number;
  /** Soft tint for monogram/chip backgrounds. */
  bg: string;
  /** Readable ink on the soft tint. */
  fg: string;
  /** Strong fill — the pay button. White text passes contrast on it. */
  strong: string;
  /** Hover state of the strong fill. */
  strongHover: string;
}

export function accentFor(seed: string, hue?: number): Accent {
  const h = hue ?? hueFromSeed(seed);
  return {
    hue: h,
    bg: `oklch(94% 0.045 ${h})`,
    fg: `oklch(38% 0.13 ${h})`,
    strong: `oklch(45% 0.15 ${h})`,
    strongHover: `oklch(40% 0.15 ${h})`,
  };
}
