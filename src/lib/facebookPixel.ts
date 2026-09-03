import { trackingConfig } from '@/config/trackingConfig';

declare global { interface Window { fbq: any; } }

const CURRENCY = trackingConfig.currency;

export const initFacebookPixel = () => {
    // Already initialized in index.html — nothing needed here
    // Pixel ID is configured via trackingConfig.facebookPixelId and
    // should be wired into the index.html init script.
};

export const trackPageView = () => {
    if (typeof window.fbq === 'function') {
        window.fbq('track', 'PageView');
    }
};

export const trackViewContent = (productName: string, price: number) => {
    if (typeof window.fbq !== 'function') return;
    window.fbq('track', 'ViewContent', {
        content_name: productName,
        value: price,
        currency: CURRENCY,
    });
};

export const trackAddToCart = (productName: string, price: number) => {
    console.log('🟢 trackAddToCart called with', productName, price, 'fbq exists?', typeof window.fbq);
    if (typeof window.fbq !== 'function') return;
    window.fbq('track', 'AddToCart', {
        content_name: productName,
        value: price,
        currency: CURRENCY,
    });
};

export const trackInitiateCheckout = (total: number) => {
    if (typeof window.fbq !== 'function') return;
    window.fbq('track', 'InitiateCheckout', {
        value: total,
        currency: CURRENCY,
    });
};

export const trackPurchase = (total: number) => {
    if (typeof window.fbq !== 'function') return;
    window.fbq('track', 'Purchase', {
        value: total,
        currency: CURRENCY,
    });
};