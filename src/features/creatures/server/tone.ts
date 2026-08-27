/**
 * The colour of a creature's photograph, for the panel its name sits on.
 *
 * The design hard-codes a slate blue behind the name. Taking it from the
 * photograph instead means the panel belongs to the animal in it — sand behind
 * a fennec fox, moss behind a tree frog — without anyone choosing a colour per
 * species.
 *
 * The panel carries white text, so a sampled colour cannot be used as found: a
 * pale sky would leave the name unreadable. The hue and a little of the
 * saturation survive; the lightness is forced into a dark band. That is the
 * whole trick — recognisably the photograph's colour, always dark enough to
 * read on.
 */

import sharp from 'sharp';

export type Tone = {
  /** The panel's top colour. */
  base: string;
  /** A shade deeper, for the foot of the gradient. */
  deep: string;
};

/** Where a sampled colour is allowed to sit once white type goes on it. */
const LIGHTNESS = { base: 0.24, deep: 0.14 };
const MAX_SATURATION = 0.42;

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g
        ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * @param url a photograph to sample. The small one is plenty — this is an
 *   average, and a thumbnail averages to the same colour as the full frame for
 *   a fraction of the bytes.
 */
export async function photoTone(url: string): Promise<Tone | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;

    // Down to 16x16 first: this is about the picture's overall colour, and the
    // resize does the averaging far faster than reading every pixel would.
    const { data } = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(16, 16, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let r = 0;
    let g = 0;
    let b = 0;
    const pixels = data.length / 3;
    for (let i = 0; i < data.length; i += 3) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }

    const { h, s } = rgbToHsl(r / pixels, g / pixels, b / pixels);
    const saturation = Math.min(s, MAX_SATURATION);
    return {
      base: hslToHex(h, saturation, LIGHTNESS.base),
      deep: hslToHex(h, saturation, LIGHTNESS.deep),
    };
  } catch {
    // A photograph that will not load is not worth failing a page over.
    return null;
  }
}

/** What the panel wears when there is no photograph, or it would not sample. */
export const FALLBACK_TONE: Tone = { base: '#314669', deep: '#1d2e4a' };
