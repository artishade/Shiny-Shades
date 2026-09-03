import { trackingConfig } from '@/config/trackingConfig';

declare global { interface Window { fbq: any; } }

const CURRENCY = trackingConfig.currency;

/** Matches the product-level IDs in the Meta catalog, not size/colour variants. */
const CONTENT_TYPE = 'product';

export type PixelItem = {
    id: string;
    name: string;
    /** Unit price — value is derived as price * quantity. */
    price: number;
    quantity?: number;
};

const qty = (item: PixelItem) => item.quantity ?? 1;

const contentIds = (items: PixelItem[]) => items.map((item) => String(item.id));

const contents = (items: PixelItem[]) =>
    items.map((item) => ({
        id: String(item.id),
        quantity: qty(item),
        item_price: item.price,
    }));

const numItems = (items: PixelItem[]) =>
    items.reduce((total, item) => total + qty(item), 0);

export const initFacebookPixel = () => {
    // Base pixel + fbq('init') live in _document.tsx; nothing needed here.
};

export const trackPageView = () => {
    if (typeof window.fbq === 'function') {
        window.fbq('track', 'PageView');
    }
};

export const trackViewContent = (item: PixelItem) => {
    if (typeof window.fbq !== 'function') return;
    window.fbq('track', 'ViewContent', {
        content_type: CONTENT_TYPE,
        content_ids: contentIds([item]),
        contents: contents([item]),
        content_name: item.name,
        value: item.price * qty(item),
        currency: CURRENCY,
    });
};

export const trackAddToCart = (item: PixelItem) => {
    if (typeof window.fbq !== 'function') return;
    window.fbq('track', 'AddToCart', {
        content_type: CONTENT_TYPE,
        content_ids: contentIds([item]),
        contents: contents([item]),
        content_name: item.name,
        value: item.price * qty(item),
        currency: CURRENCY,
    });
};

export const trackInitiateCheckout = (items: PixelItem[], total: number) => {
    if (typeof window.fbq !== 'function') return;
    window.fbq('track', 'InitiateCheckout', {
        content_type: CONTENT_TYPE,
        content_ids: contentIds(items),
        contents: contents(items),
        num_items: numItems(items),
        value: total,
        currency: CURRENCY,
    });
};

export const trackPurchase = (items: PixelItem[], total: number) => {
    if (typeof window.fbq !== 'function') return;
    window.fbq('track', 'Purchase', {
        content_type: CONTENT_TYPE,
        content_ids: contentIds(items),
        contents: contents(items),
        num_items: numItems(items),
        value: total,
        currency: CURRENCY,
    });
};
