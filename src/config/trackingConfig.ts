/**
 * Tracking & Analytics Configuration
 * IDs are read here so event helpers (facebookPixel.ts, gtm.ts)
 * can conditionally fire only when an ID is actually configured.
 */
import { SITE } from '@/config/siteConfig';
export const trackingConfig = {
    /**
     * Facebook Pixel ID — read from VITE_FB_PIXEL_ID (Vercel env var).
     * Falls back to the known ID if the env var isn't set, so nothing
     * breaks if you haven't added it to Vercel yet — but you should:
     * Vercel Project Settings > Environment Variables > VITE_FB_PIXEL_ID.
     * index.html reads the SAME env var via Vite's %VITE_*% placeholder
     * substitution, so both stay in sync automatically.
     */
    facebookPixelId: process.env.NEXT_PUBLIC_FB_PIXEL_ID || '1341948154747302',

    /**
     * Google Tag Manager container ID — read from VITE_GTM_ID (Vercel env var).
     * Format: GTM-XXXXXXX. Falls back to the known ID if unset.
     * index.html reads the SAME env var, so both stay in sync automatically.
     */
    gtmId: process.env.NEXT_PUBLIC_GTM_ID || '',

    /**
     * Google Search Console HTML-tag verification content value.
     * Leave empty string if already verified or not using Search Console.
     */
    googleSearchConsoleVerification: '',

    /**
     * ISO 4217 currency code used across all tracking events.
     */
    currency: SITE.currency.code,
} as const;

export const isTrackingEnabled = () =>
    !!(trackingConfig.facebookPixelId || trackingConfig.gtmId);

export type TrackingConfig = typeof trackingConfig;