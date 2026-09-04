/**
 * The storage vocabulary for product colors.
 *
 * `products.colors` holds plain Title-Case strings from this list (the
 * `ProductColor[]` type in src/types/index.ts does not match runtime), and
 * dedupe in the admin form is exact-string, so casing has to match exactly.
 *
 * Deliberately import-free: /api/ai-product-metadata.js consumes it too.
 * src/lib/colorUtils.ts is a separate, lowercase *rendering* map for the
 * customer side — not interchangeable with this one.
 */

export const SIMPLE_COLORS: Record<string, string> = {
  'White': '#FFFFFF', 'Off White': '#FAF9F6', 'Cream': '#FFFDD0',
  'Ivory': '#FFFFF0', 'Black': '#000000', 'Charcoal': '#36454F',
  'Dark Grey': '#A9A9A9', 'Grey': '#808080', 'Light Grey': '#D3D3D3',
  'Red': '#FF0000', 'Dark Red': '#8B0000', 'Maroon': '#800000',
  'Crimson': '#DC143C', 'Pink': '#FFC0CB', 'Hot Pink': '#FF69B4',
  'Baby Pink': '#F4C2C2', 'Rose': '#FF007F', 'Blush': '#FFB6C1',
  'Magenta': '#FF00FF', 'Purple': '#800080', 'Violet': '#EE82EE',
  'Lavender': '#E6E6FA', 'Navy': '#000080', 'Blue': '#0000FF',
  'Sky Blue': '#87CEEB', 'Baby Blue': '#89CFF0', 'Royal Blue': '#4169E1',
  'Teal': '#008080', 'Cyan': '#00FFFF', 'Turquoise': '#40E0D0',
  'Green': '#008000', 'Dark Green': '#006400', 'Light Green': '#90EE90',
  'Mint': '#98FF98', 'Olive': '#808000', 'Yellow': '#FFFF00',
  'Light Yellow': '#FFFFE0', 'Gold': '#FFD700', 'Orange': '#FFA500',
  'Peach': '#FFDAB9', 'Coral': '#FF6B6B', 'Salmon': '#FA8072',
  'Brown': '#8B4513', 'Dark Brown': '#5C4033', 'Light Brown': '#C4A882',
  'Tan': '#D2B48C', 'Beige': '#F5F5DC', 'Skin': '#FED9B0',
  'Nude': '#E8C9A0', 'Camel': '#C19A6B', 'Rose Gold': '#B76E79',
  'Copper': '#B87333', 'Silver': '#C0C0C0', 'Wine': '#722F37',
  'Burgundy': '#800020', 'Mustard': '#FFDB58', 'Khaki': '#F0E68C',
  'Lemon': '#FFF44F', 'Indigo': '#4B0082', 'Mauve': '#E0B0FF',
};

export const SIMPLE_COLOR_NAMES: string[] = Object.keys(SIMPLE_COLORS);

const CANONICAL_BY_LOWER: Record<string, string> = {};
SIMPLE_COLOR_NAMES.forEach((name) => { CANONICAL_BY_LOWER[name.toLowerCase()] = name; });

const ALIASES: Record<string, string> = {
  'gray': 'Grey', 'dark gray': 'Dark Grey', 'light gray': 'Light Grey',
  'offwhite': 'Off White', 'navy blue': 'Navy', 'golden': 'Gold',
  'sky': 'Sky Blue', 'rosegold': 'Rose Gold', 'skin tone': 'Skin',
  'light blue': 'Baby Blue', 'dark blue': 'Navy', 'sea green': 'Teal',
};

// Longest first so "Light Green" wins over "Green".
const NAMES_BY_LENGTH: string[] = [...SIMPLE_COLOR_NAMES].sort((a, b) => b.length - a.length);

/**
 * Maps a free-form color name onto the palette, or returns null when there is
 * no confident match. Dropping is preferred over guessing: a wrong color on a
 * product listing is worse than a missing one.
 */
export function snapColorName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;

  const normalized = raw.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  if (!normalized) return null;

  if (CANONICAL_BY_LOWER[normalized]) return CANONICAL_BY_LOWER[normalized];
  if (ALIASES[normalized]) return ALIASES[normalized];

  for (const name of NAMES_BY_LENGTH) {
    if (new RegExp(`\\b${name.toLowerCase()}\\b`).test(normalized)) return name;
  }
  return null;
}

/** Snaps a list, deduped and capped, reporting whatever could not be mapped. */
export function snapColorNames(
  values: unknown,
  limit = 6,
): { colors: string[]; dropped: string[] } {
  const colors: string[] = [];
  const dropped: string[] = [];

  if (!Array.isArray(values)) return { colors, dropped };

  for (const value of values) {
    const snapped = snapColorName(value);
    if (!snapped) {
      if (typeof value === 'string' && value.trim()) dropped.push(value.trim().slice(0, 40));
      continue;
    }
    if (!colors.includes(snapped) && colors.length < limit) colors.push(snapped);
  }

  return { colors, dropped };
}
