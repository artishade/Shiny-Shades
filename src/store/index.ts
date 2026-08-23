/**
 * store/index.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Single import point for all Zustand stores.
 *
 * Architecture rules:
 *   • `persist` is used ONLY for client-side data (cart, auth token, UI prefs,
 *     recently viewed). Never for data owned by Supabase.
 *   • Supabase stores (products, categories, orders) are plain Zustand stores
 *     with no localStorage persistence — Supabase is the source of truth.
 *   • Stores never import from each other to avoid circular deps.
 * ──────────────────────────────────────────────────────────────────────────────
 */

// ── Persisted (localStorage) ────────────────────────────────────────────────
export { useCartStore } from './cartStore';
export { useAdminAuthStore } from './adminAuthStore';
export { useCouponStore } from './couponStore';
export { useRecentlyViewedStore, useUIStore } from './uiStore';

// ── Supabase-backed (no localStorage) ───────────────────────────────────────
export { useProductStore } from './productStore';
export { useCategoryStore } from './categoryStore';
export { useOrderStore } from './orderStore';
export type { RealOrder, OrderCustomer, OrderItem } from './orderStore';

// ── Content store (re-exported as-is) ───────────────────────────────────────
export { useContentStore, defaultContent } from './contentStore';
export type { ContentData, Banner, AnnouncementSettings } from './contentStore';
