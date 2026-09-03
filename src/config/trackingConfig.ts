/**
 * Tracking & Analytics Configuration
 * IDs are read here so event helpers (facebookPixel.ts, gtm.ts)
 * can conditionally fire only when an ID is actually configured.
 */
import { SITE } from '@/config/siteConfig';
export const trackingConfig = {
    /**
     * Facebook Pixel ID. Set NEXT_PUBLIC_FB_PIXEL_ID in Vercel Project Settings >
     * Environment Variables; the fallback keeps tracking alive if it's unset.
     */
    facebookPixelId: process.env.NEXT_PUBLIC_FB_PIXEL_ID || '1341948154747302',

    /**
     * Google Tag Manager container ID (format: GTM-XXXXXXX). Empty disables GTM.
     */
    gtmId: process.env.NEXT_PUBLIC_GTM_ID || '',

    /**
     * Google Search Console HTML-tag verification content value — the single
     * source for the meta tag _document.tsx emits.
     */
    googleSearchConsoleVerification:
        process.env.NEXT_PUBLIC_GSC_VERIFICATION || 'S_qDJr2t5ntRG4FAH_n9NqEUkde824Aea7M7hoVuSFk',

    /** Bing Webmaster Tools verification content value. */
    bingVerification: process.env.NEXT_PUBLIC_BING_VERIFICATION || '',

    /**
     * ISO 4217 currency code used across all tracking events.
     */
    currency: SITE.currency.code,
} as const;

export const isTrackingEnabled = () =>
    !!(trackingConfig.facebookPixelId || trackingConfig.gtmId);

export type TrackingConfig = typeof trackingConfig;
