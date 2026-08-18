import { colornames as colorNameList } from 'color-name-list';
import nearestColor from 'nearest-color';

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

// ─── Build comprehensive lookup from color-name-list ─────────────────────────
const COLOR_NAME_TO_HEX: Record<string, string> = {};
const nearestColorMap: Record<string, string> = {};

colorNameList.forEach((c: { name: string; hex: string }) => {
  const key = c.name.toLowerCase();
  COLOR_NAME_TO_HEX[key] = c.hex;
  nearestColorMap[c.name] = c.hex;
});

const getNearestColor = nearestColor.from(nearestColorMap);

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

  // 3. Fast check against curated simple fashion colors
  if (SIMPLE_COLORS[lower]) {
    const val = SIMPLE_COLORS[lower];
    colorCache.set(raw, val);
    return val;
  }

  // 4. Exact match in 30,000+ name dictionary
  if (COLOR_NAME_TO_HEX[lower]) {
    const val = COLOR_NAME_TO_HEX[lower];
    colorCache.set(raw, val);
    return val;
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

  // 6. Nearest color fuzzy matching
  try {
    const matched = getNearestColor(lower);
    if (matched && (matched.value || matched.hex)) {
      const val = matched.value || matched.hex;
      colorCache.set(raw, val);
      return val;
    }
  } catch {
    // ignore
  }

  // 7. Fallback
  colorCache.set(raw, fallback);
  return fallback;
}
