import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_RECENT = 10; // max recently-viewed IDs persisted
const MAX_WISHLIST = 50; // max wishlist IDs persisted

// ─────────────────────────────────────────────────────────────────────────────
// 1. UI STORE — ephemeral session state, no persistence
//    Holds all transient overlay / drawer / modal open-states.
// ─────────────────────────────────────────────────────────────────────────────

interface UIStore {
  // ── Existing state ──────────────────────────────────────────────────────────
  mobileMenuOpen: boolean;
  searchOpen: boolean;
  quickViewProduct: Product | null;

  // ── Wishlist UI state (open/close panel — NOT the wishlist data) ────────────
  wishlistOpen: boolean;

  // ── Mobile sticky cart state ────────────────────────────────────────────────
  /** true → the sticky bottom "View Cart" bar is visible on mobile */
  stickyCartVisible: boolean;
  /** Pulse animation trigger — set true briefly when an item is added to cart */
  stickyCartPulse: boolean;

  // ── Setters ─────────────────────────────────────────────────────────────────
  setMobileMenuOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setQuickViewProduct: (product: Product | null) => void;
  setWishlistOpen: (open: boolean) => void;
  setStickyCartVisible: (visible: boolean) => void;
  /**
   * Triggers a brief pulse on the sticky cart bar (e.g. after Add to Cart).
   * Automatically resets after `durationMs` (default 600 ms).
   */
  triggerStickyCartPulse: (durationMs?: number) => void;

  // ── Convenience toggles ─────────────────────────────────────────────────────
  toggleMobileMenu: () => void;
  toggleSearch: () => void;
  toggleWishlist: () => void;

  // ── Close-all helper (e.g. on route change) ─────────────────────────────────
  closeAllOverlays: () => void;
}

export const useUIStore = create<UIStore>()((set,) => ({
  // ── Initial state ────────────────────────────────────────────────────────────
  mobileMenuOpen: false,
  searchOpen: false,
  quickViewProduct: null,
  wishlistOpen: false,
  stickyCartVisible: false,
  stickyCartPulse: false,

  // ── Setters ──────────────────────────────────────────────────────────────────
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setQuickViewProduct: (product) => set({ quickViewProduct: product }),
  setWishlistOpen: (open) => set({ wishlistOpen: open }),
  setStickyCartVisible: (visible) => set({ stickyCartVisible: visible }),

  triggerStickyCartPulse: (durationMs = 600) => {
    set({ stickyCartPulse: true });
    setTimeout(() => set({ stickyCartPulse: false }), durationMs);
  },

  // ── Toggles ──────────────────────────────────────────────────────────────────
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
  toggleWishlist: () => set((s) => ({ wishlistOpen: !s.wishlistOpen })),

  // ── Close all overlays (call on route change in App.tsx) ─────────────────────
  closeAllOverlays: () =>
    set({
      mobileMenuOpen: false,
      searchOpen: false,
      quickViewProduct: null,
      wishlistOpen: false,
      // stickyCartVisible intentionally NOT closed — it persists across pages
    }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// 2. RECENTLY VIEWED STORE — persisted in localStorage
//    Stores product IDs only; resolves to full Product objects on demand.
//    Persistence key kept as 'recent' (no breaking change).
// ─────────────────────────────────────────────────────────────────────────────

interface RecentlyViewedStore {
  productIds: string[];

  /** Call on ProductDetail mount */
  addProduct: (id: string) => void;
  clear: () => void;

  /**
   * Resolves stored IDs against a live products array.
   * Optionally excludes one product (the one currently being viewed)
   * and limits results.
   */
  getRecentProducts: (
    allProducts: Product[],
    excludeId?: string,
    limit?: number,
  ) => Product[];
}

export const useRecentlyViewedStore = create<RecentlyViewedStore>()(
  persist(
    (set, get) => ({
      productIds: [],

      addProduct: (id) => {
        const deduped = get().productIds.filter((pid) => pid !== id);
        set({ productIds: [id, ...deduped].slice(0, MAX_RECENT) });
      },

      clear: () => set({ productIds: [] }),

      getRecentProducts: (allProducts, excludeId, limit = 8) => {
        const { productIds } = get();
        const productMap = new Map(allProducts.map((p) => [p.id, p]));
        return productIds
          .filter((id) => id !== excludeId)
          .map((id) => productMap.get(id))
          .filter((p): p is Product => Boolean(p))
          .slice(0, limit);
      },
    }),
    { name: 'website-recent' },
  ),
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. WISHLIST STORE — persisted in localStorage
//    Stores product IDs only (same pattern as recently viewed).
//    UI open/close state lives in useUIStore above.
// ─────────────────────────────────────────────────────────────────────────────

interface WishlistStore {
  wishlistIds: string[];

  /** Toggle: adds if absent, removes if present */
  toggleWishlistItem: (id: string) => void;
  addToWishlist: (id: string) => void;
  removeFromWishlist: (id: string) => void;
  isWishlisted: (id: string) => boolean;
  clearWishlist: () => void;

  /** Resolves stored IDs against a live products array */
  getWishlistProducts: (allProducts: Product[]) => Product[];

  /** Reactive count for badge display */
  wishlistCount: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      wishlistIds: [],

      toggleWishlistItem: (id) => {
        const current = get().wishlistIds;
        if (current.includes(id)) {
          set({ wishlistIds: current.filter((wid) => wid !== id) });
        } else {
          set({ wishlistIds: [id, ...current].slice(0, MAX_WISHLIST) });
        }
      },

      addToWishlist: (id) => {
        const current = get().wishlistIds;
        if (current.includes(id)) return;
        set({ wishlistIds: [id, ...current].slice(0, MAX_WISHLIST) });
      },

      removeFromWishlist: (id) =>
        set({ wishlistIds: get().wishlistIds.filter((wid) => wid !== id) }),

      isWishlisted: (id) => get().wishlistIds.includes(id),

      clearWishlist: () => set({ wishlistIds: [] }),

      getWishlistProducts: (allProducts) => {
        const { wishlistIds } = get();
        const productMap = new Map(allProducts.map((p) => [p.id, p]));
        return wishlistIds
          .map((id) => productMap.get(id))
          .filter((p): p is Product => Boolean(p));
      },

      wishlistCount: () => get().wishlistIds.length,
    }),
    { name: 'wishlist' },
  ),
);