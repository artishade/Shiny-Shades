// ─── Standard fashion colors mapping (fast lookup) ───────────────────────────
export const SIMPLE_COLORS: Record<string, string> = {
  'white': '#FFFFFF',
  'off white': '#FAF9F6',
  'cream': '#FFFDD0',
  'ivory': '#FFFFF0',
  'black': '#000000',
  'charcoal': '#36454F',
  'dark grey': '#4A4A4A',
  'grey': '#808080',
  'gray': '#808080',
  'light grey': '#D3D3D3',
  'light gray': '#D3D3D3',
  'red': '#E53E3E',
  'dark red': '#8B0000',
  'maroon': '#800000',
  'crimson': '#DC143C',
  'pink': '#FFB6C1',
  'hot pink': '#FF69B4',
  'baby pink': '#F4C2C2',
  'rose': '#FF007F',
  'rose gold': '#B76E79',
  'blush': '#E8C9B8',
  'magenta': '#FF00FF',
  'purple': '#805AD5',
  'violet': '#EE82EE',
  'lavender': '#E6E6FA',
  'navy': '#1A237E',
  'blue': '#3182CE',
  'sky blue': '#87CEEB',
  'baby blue': '#89CFF0',
  'royal blue': '#4169E1',
  'teal': '#008080',
  'cyan': '#00FFFF',
  'turquoise': '#40E0D0',
  'green': '#38A169',
  'dark green': '#006400',
  'light green': '#90EE90',
  'mint': '#98FF98',
  'olive': '#808000',
  'yellow': '#ECC94B',
  'light yellow': '#FFFFE0',
  'gold': '#FFD700',
  'orange': '#ED8936',
  'peach': '#FFCBA4',
  'coral': '#FF6B6B',
  'salmon': '#FA8072',
  'brown': '#8B4513',
  'dark brown': '#5C4033',
  'light brown': '#C4A882',
  'tan': '#D2B48C',
  'beige': '#F5F0E8',
  'skin': '#FED9B0',
  'nude': '#E8C9A0',
  'camel': '#C19A6B',
  'copper': '#B87333',
  'silver': '#C0C0C0',
  'wine': '#722F37',
  'burgundy': '#800020',
  'mustard': '#FFDB58',
  'khaki': '#F0E68C',
  'lemon': '#FFF44F',
  'indigo': '#4B0082',
  'mauve': '#E0B0FF',
  'multicolor': 'linear-gradient(135deg,#FF6B6B,#FFD700,#6BCB77,#4D96FF,#C77DFF)',
  'multi': 'linear-gradient(135deg,#FF6B6B,#FFD700,#6BCB77,#4D96FF,#C77DFF)',
  'rainbow': 'linear-gradient(135deg,red,orange,yellow,green,blue,violet)',
};

// ─── Compound / non-palette names present in products.colors ─────────────────
// Hex values are the ones color-name-list resolved these to, kept verbatim so
// removing that 1.1 MB dependency from the customer bundle changed no swatch.
const EXTRA_COLORS: Record<string, string> = {
  'ash': '#BEBAA7',
  'bottle green': '#006A4E',
  'light blue': '#ADD8E6',
  'lime green': '#8EAD2C',
  'magenta pink': '#CC338B',
  'mustard yellow': '#E1AD01',
  'navy blue': '#000080',
  'sky': '#76D6FF',
  'waiouru': '#4C4E31',
};

const COLOR_NAME_TO_HEX: Record<string, string> = { ...SIMPLE_COLORS, ...EXTRA_COLORS };

// Longest first so "light green" beats "green" when both appear as words.
const PALETTE_NAMES_BY_LENGTH = Object.keys(COLOR_NAME_TO_HEX)
  .filter((name) => !COLOR_NAME_TO_HEX[name].startsWith('linear-gradient'))
  .sort((a, b) => b.length - a.length);

/**
 * Last resort for free-form names an admin may type ("Bottle Green Silk").
 * Picks the palette colour named earliest in the string, longest match first,
 * so "Black & White mix" resolves to black rather than the neutral fallback.
 */
function matchPaletteWord(lower: string): string | null {
  let bestAt = Infinity;
  let bestHex: string | null = null;

  for (const name of PALETTE_NAMES_BY_LENGTH) {
    const at = lower.indexOf(name);
    if (at === -1) continue;
    // Word boundaries only — "red" must not match inside "shredded".
    const before = at === 0 ? ' ' : lower[at - 1];
    const after = lower[at + name.length] ?? ' ';
    if (/[a-z]/.test(before) || /[a-z]/.test(after)) continue;
    if (at < bestAt) {
      bestAt = at;
      bestHex = COLOR_NAME_TO_HEX[name];
    }
  }

  return bestHex;
}

// Memory cache for resolved color queries
const colorCache = new Map<string, string>();

/**
 * Resolves any color string (name, hex, rgb, or gradient) to a CSS-valid color string.
 * Ensures custom colors selected in admin panel always render a filled circle.
 */
export function resolveColorHex(input: string | undefined | null, fallback = '#C4956A'): string {
  if (!input) return fallback;
  const raw = String(input).trim();
  if (!raw) return fallback;

  if (colorCache.has(raw)) {
    return colorCache.get(raw)!;
  }

  // 1. Direct hex checks (#fff, #ffffff, #ffffffff)
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(raw)) {
    colorCache.set(raw, raw);
    return raw;
  }

  // 2. Gradients or rgb/hsl functional notations
  if (
    raw.startsWith('linear-gradient') ||
    raw.startsWith('radial-gradient') ||
    raw.startsWith('rgb(') ||
    raw.startsWith('rgba(') ||
    raw.startsWith('hsl(') ||
    raw.startsWith('hsla(')
  ) {
    colorCache.set(raw, raw);
    return raw;
  }

  const lower = raw.toLowerCase();

  // 3. Exact match against the curated palette
  if (COLOR_NAME_TO_HEX[lower]) {
    const val = COLOR_NAME_TO_HEX[lower];
    colorCache.set(raw, val);
    return val;
  }

  // 4. Compound names — resolved before the CSS test so the server and the
  // client agree; step 5 is client-only and would otherwise mismatch on hydrate.
  const word = matchPaletteWord(lower);
  if (word) {
    colorCache.set(raw, word);
    return word;
  }

  // 5. Browser CSS native color test (e.g., standard CSS color names)
  if (typeof document !== 'undefined') {
    try {
      const s = new Option().style;
      s.color = lower;
      if (s.color !== '') {
        colorCache.set(raw, lower);
        return lower;
      }
    } catch {
      // ignore
    }
  }

  // 6. Fallback
  colorCache.set(raw, fallback);
  return fallback;
}
