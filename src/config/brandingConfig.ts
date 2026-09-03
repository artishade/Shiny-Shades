/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║              brandingConfig.ts                               ║
 * ║  THE SINGLE SOURCE OF TRUTH for brand name + theme colors.  ║
 * ║                                                              ║
 * ║  HOW TO RENAME YOUR STORE                                    ║
 * ║   1. Edit nameTop, nameBottom, fullName, shortName           ║
 * ║   2. Update defaultTitle & defaultDescription to match       ║
 * ║   3. Run `npm run build` — every page updates automatically  ║
 * ║                                                              ║
 * ║  HOW TO CHANGE YOUR THEME                                    ║
 * ║   Option A → set activeTheme to a preset name below         ║
 * ║   Option B → edit the 'Custom' preset colors directly        ║
 * ║   Then run `npm run build` — colors apply site-wide          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─── Color shape ──────────────────────────────────────────────────────────────

export interface BrandColors {
    /** Main accent — buttons, active nav, highlights */
    primary: string;
    /** Lighter tint of primary */
    primaryLight: string;
    /** Darker shade / deep accent */
    primaryDark: string;
    /** Soft background tint (cards, hover states) */
    blush: string;
    blushLight: string;
    blushDark: string;
    /** Page / body background */
    softBg: string;
    /** Primary text / headings */
    charcoal: string;
    /** Muted text / labels / sub-headings */
    warmGray: string;
}

export type ThemeName =
    | 'Rose Gold'
    | 'Midnight Purple'
    | 'Ocean Teal'
    | 'Emerald'
    | 'Crimson'
    | 'Black & White'
    | 'Luxury Gold'
    | 'Royal Noir'
    | 'Custom';

// ─── Theme presets ────────────────────────────────────────────────────────────

export const THEMES: Record<ThemeName, BrandColors> = {
    /** Current default — warm pinks, rose gold accents */
    'Rose Gold': {
        primary: '#B76E79',
        primaryLight: '#D4949E',
        primaryDark: '#8B4557',
        blush: '#F4C2C2',
        blushLight: '#FADBD8',
        blushDark: '#E8A0A0',
        softBg: '#FDF8F4',
        charcoal: '#2D2D2D',
        warmGray: '#6B5B5B',
    },
'Royal Noir': {
    primary: '#D4AF37',
    primaryLight: '#F2D675',
    primaryDark: '#9C7B18',

    blush: '#2A2A2A',
    blushLight: '#383838',
    blushDark: '#1B1B1B',

    softBg: '#0D0D0D',

    charcoal: '#FFFFFF',

    warmGray: '#B8B8B8',
},
    /** Deep violet — elegant & editorial */
    'Midnight Purple': {
        primary: '#7C5CBF',
        primaryLight: '#A489D8',
        primaryDark: '#5A3D8A',
        blush: '#E8D5F5',
        blushLight: '#F0E4FA',
        blushDark: '#D4B8EC',
        softBg: '#F9F4FE',
        charcoal: '#2A2040',
        warmGray: '#6B5B7B',
    },

    /** Cool teal — fresh & modern */
    'Ocean Teal': {
        primary: '#4A9B8E',
        primaryLight: '#72B8AD',
        primaryDark: '#2E7268',
        blush: '#C8E8E4',
        blushLight: '#DCF0EE',
        blushDark: '#A8D5CF',
        softBg: '#F2FAF9',
        charcoal: '#1E3535',
        warmGray: '#4A6B69',
    },

    /** Lush green — organic & natural */
    'Emerald': {
        primary: '#4B8B5A',
        primaryLight: '#70A97E',
        primaryDark: '#2F6639',
        blush: '#C8E5CE',
        blushLight: '#DDF0E2',
        blushDark: '#A8D2B2',
        softBg: '#F2FAF4',
        charcoal: '#1E3524',
        warmGray: '#4A6B52',
    },

    /** Bold red — passionate & luxe */
    'Crimson': {
        primary: '#C0392B',
        primaryLight: '#E05747',
        primaryDark: '#922B21',
        blush: '#FADBD8',
        blushLight: '#FDECEA',
        blushDark: '#F5C6C1',
        softBg: '#FFF8F7',
        charcoal: '#2D1F1E',
        warmGray: '#6B4542',
    },

    /** Pure monochrome — minimalist & high-contrast */
    'Black & White': {
        primary: '#000000',
        primaryLight: '#3A3A3A',
        primaryDark: '#000000',
        blush: '#E8E8E8',
        blushLight: '#F5F5F5',
        blushDark: '#D4D4D4',
        softBg: '#FFFFFF',
        charcoal: '#000000',
        warmGray: '#5C5C5C',
    },
     'Luxury Gold': {
    // Premium Champagne Gold
    primary: '#C9A227',

    // Bright metallic gold
    primaryLight: '#E4C96B',

    // Rich antique gold
    primaryDark: '#8B6B16',

    // Luxury cream
    blush: '#F7F2E8',

    blushLight: '#FCFAF5',

    blushDark: '#E9DFC9',

    // Off-white instead of pure white
    softBg: '#FAF8F3',

    // Deep black
    charcoal: '#111111',

    // Warm luxury gray
    warmGray: '#66615B',
},
    /**
     * Custom palette — edit freely.
     * Then set activeTheme: 'Custom' below to use it.
     */
    'Custom': {
        primary: '#d3aa5fff',      // Champagne Gold
        primaryLight: '#E0C595',
        primaryDark: '#A8864A',

        blush: '#F5F1EA',
        blushLight: '#FAF8F4',
        blushDark: '#E8DDCD',

        softBg: '#FFFFFF',

        charcoal: '#121212',     // Rich Black
        warmGray: '#6F6F6F',
    },
};

// ══════════════════════════════════════════════════════════════
//  ▼▼▼  EDIT THIS SECTION TO REBRAND / RETHEME YOUR STORE  ▼▼▼
// ══════════════════════════════════════════════════════════════

const ACTIVE_THEME: ThemeName = 'Luxury Gold';   // ← change theme here

export const BRAND = {
    // ── Brand Identity ────────────────────────────────────────
    /** Line 1 of the stacked logo (navbar, admin sidebar, login) */
    nameTop: 'Shiny Shades',
    /** Line 2 of the stacked logo */
    nameBottom: '',
    /** Full single-line name used in copyright, SEO, watermarks */
    fullName: 'Shiny Shades',
    /** Short abbreviation — used in localStorage keys */
    shortName: 'Shiny Shades',
    /** Prefix used for generated order numbers, e.g. "ORV-482910" */
    orderPrefix: 'SS',
    // ── On-page Content ───────────────────────────────────────
    description:
        'Luxury feminine fashion crafted for the modern woman. Every piece tells a story of elegance, confidence, and timeless beauty.',
    tagline: 'Designed with love for the modern woman',
    searchHint: 'dresses, Western tops, Slimwear, Lingeries, nightdress, accessories',

    /** Default text tiled as watermark on product images */
    watermarkText: 'Shiny Shades',

    // ── SEO ───────────────────────────────────────────────────
    defaultTitle:
        "Shiny Shades — Premium Women's Fashion",
    defaultDescription:
        "Shop Shiny Shades — premium destination for  western Dress, traditional dress, shapewear, nightwear, couple nightwear, and elegant western dresses. Fast delivery across Bangladesh.",

// ── Assets ────────────────────────────────────────────────
    logoUrl: '/web-app-manifest-512x512.png',
    faviconUrl: '/favicon.ico',
    /** Single source of truth for OG / Twitter share image */
    ogImage: `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'nrdmy8ir'}/image/upload/f_auto,q_auto,w_1200,h_630,c_fill/${process.env.NEXT_PUBLIC_CLOUDINARY_OG_FOLDER || 'shinyshades'}/${process.env.NEXT_PUBLIC_CLOUDINARY_OG_FILENAME || 'og-banner.jpg'}`,


    // ── Theme ─────────────────────────────────────────────────
    activeTheme: ACTIVE_THEME,
    colors: THEMES[ACTIVE_THEME],
};

// ══════════════════════════════════════════════════════════════
//  UI COMPONENT CONFIG
//  Fine-grained control over individual UI elements.
//  Colors here override the theme for specific components.
// ══════════════════════════════════════════════════════════════

export const UI = {

    // ── Buttons ────────────────────────────────────────────────

    button: {
        /** Primary CTA — "Buy Now", "Place Order", "Shop Now" */
        primary: {
            background: BRAND.colors.primary,
            text: '#ffffff',
            hoverBackground: BRAND.colors.primaryDark,
        },

        /** Secondary / outline — "Add to Bag", "View Details" */
        secondary: {
            background: 'transparent',
            text: BRAND.colors.primary,
            border: BRAND.colors.primary,
            hoverBackground: BRAND.colors.blushLight,
        },

        /** Destructive — "Remove", "Delete", "Cancel Order" */
        danger: {
            background: '#DC2626',
            text: '#ffffff',
            hoverBackground: '#B91C1C',
        },

        /** Disabled state — applied on top of any button variant */
        disabled: {
            background: '#D1D5DB',
            text: '#9CA3AF',
        },
    },

    // ── Badges ─────────────────────────────────────────────────

    badge: {
        sale: { background: '#EF4444', text: '#ffffff' },
        new: { background: BRAND.colors.primary, text: '#ffffff' },
        trending: { background: BRAND.colors.primaryDark, text: '#ffffff' },
        featured: { background: BRAND.colors.primaryLight, text: '#ffffff' },
    },

    // ── Price Display ───────────────────────────────────────────

    price: {
        /** Current / sale price */
        current: BRAND.colors.primaryDark,
        /** Crossed-out compare price */
        compare: '#9CA3AF',
        /** Discount % badge */
        discountBadge: { background: '#EF4444', text: '#ffffff' },
    },

    // ── Stock Indicators ────────────────────────────────────────

    stock: {
        inStock: '#16A34A',
        lowStock: '#D97706',
        outOfStock: '#DC2626',
    },

    // ── Forms & Inputs ──────────────────────────────────────────

    input: {
        borderFocus: BRAND.colors.primary,
        accentColor: BRAND.colors.primary,   // range sliders, checkboxes, radios
    },

} as const;

export type UIConfig = typeof UI;
// ══════════════════════════════════════════════════════════════
//  ▲▲▲  STOP EDITING HERE  ▲▲▲
// ══════════════════════════════════════════════════════════════

/**
 * The `--brand-*` custom properties that index.css's `@theme` block aliases into
 * Tailwind's color utilities (`text-rose-gold`, `bg-blush-light`, …).
 * Serialized into a `<style>` tag by _document.tsx so ACTIVE_THEME is already
 * applied on first paint.
 */
export const BRAND_THEME_CSS = `:root{${Object.entries({
    'primary': BRAND.colors.primary,
    'primary-light': BRAND.colors.primaryLight,
    'primary-dark': BRAND.colors.primaryDark,
    'blush': BRAND.colors.blush,
    'blush-light': BRAND.colors.blushLight,
    'blush-dark': BRAND.colors.blushDark,
    'soft-bg': BRAND.colors.softBg,
    'charcoal': BRAND.colors.charcoal,
    'warm-gray': BRAND.colors.warmGray,
})
    .map(([name, value]) => `--brand-${name}:${value}`)
    .join(';')}}`;

// ─── Legacy aliases ──────────────────────────────────────────────────────────
// Kept so files that still import `brandingConfig` or `BRAND` the old way
// don't break before you get around to updating them.

export const brandingConfig = {
    logoUrl: BRAND.logoUrl,
    faviconUrl: BRAND.faviconUrl,
    footerCopyright: `© {year} ${BRAND.fullName}. All rights reserved.`,
    companyName: BRAND.fullName,
    tagline: BRAND.tagline,
    colors: {
        primary: BRAND.colors.primary,
        secondary: BRAND.colors.warmGray,
        accent: BRAND.colors.primaryDark,
        background: BRAND.colors.softBg,
        text: BRAND.colors.charcoal,
    },
} as const;

export const getCopyrightText = () =>
    brandingConfig.footerCopyright.replace('{year}', new Date().getFullYear().toString());

export type BrandConfig = typeof BRAND;
export type BrandingConfig = typeof brandingConfig;
