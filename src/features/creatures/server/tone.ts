/**
 * The colour of a creature's photograph, for the panel its name sits on.
 *
 * The design hard-codes a slate blue. Taking the colour from the photograph
 * instead means the panel belongs to the animal in it — sand behind a fennec
 * fox, moss behind a tree frog — without anyone choosing a colour per species.
 *
 * Two things matter for it to actually look like the picture:
 *
 * It is the *dominant* colour, not the average. Averaging every pixel of any
 * photograph lands on the same muddy brown-grey, because that is what mixing a
 * whole image together gives you. Quantising into bins and taking the fullest
 * one returns a colour you can actually point at in the picture.
 *
 * And the colour is used as found. An earlier version forced it dark so white
 * type would sit on it, which meant the panel never matched the photograph —
 * it only shared its hue. Instead the text colour is chosen from the panel's
 * luminance, so a pale sand panel takes ink and a deep forest one takes white.
 */

import sharp from 'sharp';

export type Tone = {
  /** The panel's colour, as found in the photograph. */
  base: string;
  /** The same colour a little deeper, for the foot of the gradient. */
  deep: string;
  /** Whichever of ink or white can be read on `base`. */
  ink: string;
};

/** Bins per channel. Six is coarse enough to gather a shade, fine enough to keep it. */
const BINS = 6;

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6
    : max === g ? ((b - r) / d + 2) / 6
    : ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Perceived brightness, for deciding what can be read on top. */
function luminance(r: number, g: number, b: number) {
  const c = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** WCAG AA for large text, which is what sits on this panel. */
const TARGET_CONTRAST = 4.5;
const INK = '#201f1d';

function hexLuminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return luminance((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

function contrast(a: string, b: string) {
  const [x, y] = [hexLuminance(a), hexLuminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

function pickInk(h: number, s: number, l: number) {
  const hex = hslToHex(h, s, l);
  return contrast(hex, '#ffffff') >= contrast(hex, INK) ? '#ffffff' : INK;
}

export async function photoTone(url: string): Promise<Tone | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;

    const { data } = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(48, 48, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Gather pixels into bins, weighting colour above grey — a washed-out sky
    // covers more of a photograph than the animal does, but it is not what the
    // picture looks like.
    const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const { s } = rgbToHsl(r, g, b);
      const weight = 0.35 + s;
      const key =
        Math.floor((r / 256) * BINS) * BINS * BINS +
        Math.floor((g / 256) * BINS) * BINS +
        Math.floor((b / 256) * BINS);
      const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      bin.n += weight;
      bin.r += r * weight;
      bin.g += g * weight;
      bin.b += b * weight;
      bins.set(key, bin);
    }
    if (!bins.size) return null;

    const top = [...bins.values()].sort((a, b) => b.n - a.n)[0];
    const r = top.r / top.n, g = top.g / top.n, b = top.b / top.n;

    const { h, s, l } = rgbToHsl(r, g, b);
    // Only the extremes are pulled back, so the panel can never be pure black
    // or pure white; everything between is the photograph's own value.
    let base = Math.min(Math.max(l, 0.1), 0.88);

    // Whichever of ink or white reads better on it — and then, if neither
    // clears the mark, the colour is walked away from that text until one
    // does. Hue and saturation are never touched, so the panel still belongs
    // to the photograph; only its value moves, and only as far as it must.
    let ink = pickInk(h, s, base);
    let guard = 0;
    while (contrast(hslToHex(h, s, base), ink) < TARGET_CONTRAST && guard++ < 40) {
      base += ink === '#ffffff' ? -0.02 : 0.02;
      if (base <= 0.04 || base >= 0.96) break;
      ink = pickInk(h, s, base);
    }

    return {
      base: hslToHex(h, s, base),
      deep: hslToHex(h, s, Math.max(base - 0.12, 0.04)),
      ink,
    };
  } catch {
    // A photograph that will not load is not worth failing a page over.
    return null;
  }
}

/** What the panel wears when there is no photograph, or it would not sample. */
export const FALLBACK_TONE: Tone = { base: '#314669', deep: '#1d2e4a', ink: '#ffffff' };
