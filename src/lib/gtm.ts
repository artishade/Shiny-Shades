// src/lib/gtm.ts

import { trackingConfig } from '@/config/trackingConfig';

declare global {
    interface Window { dataLayer: any[]; }
}

const CURRENCY = trackingConfig.currency;

// NOTE: The GTM container ID (trackingConfig.gtmId, format "GTM-XXXXXXX")
// is loaded via the GTM snippet in index.html. This file only pushes
// events into window.dataLayer, which GTM reads from once the container
// script (using trackingConfig.gtmId) has initialized it.

const push = (obj: object) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(obj);
};

// Called automatically by GA4 base tag — no need to call manually
export const gtmPageView = (path: string) => {
    push({ event: 'page_view', page_path: path });
};

export const gtmViewItem = (id: string, name: string, price: number, category?: string) => {
    push({
        event: 'view_item',
        ecommerce: {
            items: [{ item_id: id, item_name: name, price, item_category: category ?? '' }]
        }
    });
};

export const gtmAddToCart = (id: string, name: string, price: number, quantity: number) => {
    push({
        event: 'add_to_cart',
        ecommerce: {
            items: [{ item_id: id, item_name: name, price, quantity }]
        }
    });
};

export const gtmBeginCheckout = (total: number, items: { id: string; name: string; price: number; quantity: number }[]) => {
    push({
        event: 'begin_checkout',
        ecommerce: {
            value: total,
            currency: CURRENCY,
            items: items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity }))
        }
    });
};

export const gtmPurchase = (orderId: string, total: number, items: { id: string; name: string; price: number; quantity: number }[]) => {
    push({
        event: 'purchase',
        ecommerce: {
            transaction_id: orderId,
            value: total,
            currency: CURRENCY,
            items: items.map(i => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity }))
        }
    });
};