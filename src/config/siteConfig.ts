/**
 * siteConfig.ts
 * Site-wide settings: payment methods, social links, domain, SEO.
 *
 * Brand name, title, and description are pulled automatically from
 * brandingConfig.ts — change them there, not here.
 */

import { BRAND } from './brandingConfig';
import { CONTACT } from './contactConfig';

export const SITE = {
    /** Payment methods shown in footer */
    paymentMethods: ['bKash', 'Nagad', 'SSLCommerz', 'COD'] as string[],

    /** Social links — pulled from contactConfig so there's one source of truth */
    instagram: CONTACT.instagram,
    facebook: CONTACT.facebook,

    /** Canonical domain (no trailing slash) */
    domain: 'https://shinyshades.vercel.app',

    /** SEO / meta — derived from brandingConfig so renaming propagates here too */
    defaultTitle: BRAND.defaultTitle,
    defaultDescription: BRAND.defaultDescription,

keywords: [
    // Brand
    BRAND.fullName,
    'Shiny Shades',
    'Shiny Shades Bangladesh',

    // Fashion
    'women fashion',
    'fashion',
    'ladies fashion',
    'girls fashion',
    'trendy fashion',
    'latest fashion',
    'fashion store',
    'online fashion shop',
    'fashion boutique',
    'premium fashion',

    // Western Wear
    'western wear',
    'western dresses',
    'western outfit',
    'western clothing',
    'casual dresses',
    'party dresses',
    'evening dresses',
    'mini dress',
    'maxi dress',
    'midi dress',
    'bodycon dress',
    'summer dress',
    'floral dress',
    'formal dress',
    'co-ord set',
    'two piece set',
    'crop top',
    'tops',
    'blouse',
    'shirts',
    't-shirts',
    'jeans',
    'wide leg pants',
    'cargo pants',
    'skirts',
    'jumpsuit',
    'romper',
    'blazer',
    'hoodie',
    'sweatshirt',
    'cardigan',
    'fashion outfit',

    // Traditional Wear
    'traditional dress',
    'ethnic wear',
    'deshi fashion',
    'salwar kameez',
    'three piece',
    'kurti',
    'kameez',
    'long kurti',
    'short kurti',
    'anarkali',
    'kaftan',
    'saree',
    'cotton saree',
    'silk saree',
    'party saree',
    'lehenga',
    'bridal dress',
    'eid collection',
    'pohela boishakh dress',
    'festive wear',

    // Jewelry
    'jewelry',
    'jewellery',
    'fashion jewelry',
    'fashion jewellery',
    'earrings',
    'necklace',
    'necklace set',
    'bracelet',
    'bangles',
    'ring',
    'finger ring',
    'anklet',
    'nose pin',
    'pendant',
    'chain',
    'hair accessories',
    'hair clips',
    'pearl jewelry',
    'gold plated jewelry',
    'silver jewelry',
    'minimal jewelry',
    'luxury jewelry',

    // Cosmetics
    'cosmetics',
    'beauty products',
    'makeup',
    'skincare',
    'lipstick',
    'lip gloss',
    'lip tint',
    'foundation',
    'concealer',
    'compact powder',
    'blush',
    'highlighter',
    'eyeliner',
    'mascara',
    'eyeshadow',
    'brow pencil',
    'primer',
    'setting spray',
    'makeup brush',
    'beauty tools',
    'face wash',
    'serum',
    'moisturizer',
    'sunscreen',
    'body lotion',
    'perfume',
    'fragrance',

    // Shopping Intent
    'buy online',
    'online shopping',
    'fashion online',
    'online boutique',
    'shop online',
    'best fashion brand',
    'premium clothing',
    'affordable fashion',
    'luxury fashion',
    'new arrivals',
    'trending collection',
    'exclusive collection',
    'limited edition',

    // Bangladesh SEO
    'Bangladesh fashion',
    'fashion Bangladesh',
    'online shopping Bangladesh',
    'western dresses Bangladesh',
    'traditional dress Bangladesh',
    'jewelry Bangladesh',
    'cosmetics Bangladesh',
    'ladies dress Bangladesh',
    'women clothing Bangladesh',
    'fashion accessories Bangladesh',
    'best online boutique Bangladesh',
    'fashion store Bangladesh',
    'Dhaka fashion',
    'buy dresses online Bangladesh',
    'buy cosmetics online Bangladesh',
    'buy jewelry online Bangladesh',
] as string[],

    ogImage: BRAND.ogImage,
    // ─── Currency ───────────────────────────────────────────────
    currency: {
        symbol: '৳',
        code: 'BDT',
    },
} as const;

export type SiteConfig = typeof SITE;

// ─── Legacy alias ─────────────────────────────────────────────────────────────
export const siteConfig = {
    websiteName: BRAND.fullName,
    websiteShortName: BRAND.shortName,
    defaultTitle: BRAND.defaultTitle,
    defaultDescription: BRAND.defaultDescription,
    keywords: SITE.keywords,
    ogImage: SITE.ogImage,
    domain: SITE.domain,
} as const;

export type SiteConfigLegacy = typeof siteConfig;