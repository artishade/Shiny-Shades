import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — stale after this, refetch on next visit
const MAX_RELATED = 8;             // max related products returned
const MAX_RECENT = 20;            // max recently-viewed IDs tracked in store

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc'
  | 'rating_desc'
  | 'trending';

export interface ProductFilters {
  category?: string;       // categorySlug
  search?: string;         // name / tags / description
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  tags?: string[];
  isFeatured?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
  isOnSale?: boolean;
  inStockOnly?: boolean;
}

/** Granular loading keys so UI can show per-operation spinners */
export interface LoadingState {
  list: boolean;       // initial full-list fetch
  slug: boolean;       // single-product-by-slug lookup
  related: boolean;    // related products fetch
}

export interface ProductError {
  code: 'FETCH_FAILED' | 'SLUG_NOT_FOUND' | 'RELATED_FAILED' | 'UNKNOWN';
  message: string;
  at: number; // Date.now() — lets UI decide if error is stale
}

// ─── Row → Domain ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProduct(item: any): Product {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description || '',
    shortDescription: item.short_description || '',
    price: Number(item.price) || 0,
    comparePrice: item.compare_price ?? undefined,
    images: item.images || [],
    category: item.category_name || '',
    categorySlug: item.category_slug || '',
    sizes: item.sizes || [],
    colors: item.colors || [],
    stock: Number(item.stock) || 0,
    sku: item.sku || '',
    tags: item.tags || [],
    isFeatured: item.is_featured || false,
    isTrending: item.is_trending || false,
    isNewArrival: item.is_new_arrival || false,
    isOnSale: item.is_on_sale || false,
    rating: Number(item.rating) || 0,
    reviewCount: Number(item.review_count) || 0,
    createdAt: item.created_at || '',
    updatedAt: item.updated_at || '',
    customText: item.custom_text || '',
    videoUrl: item.video_url || '',
  };
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function fetchAllFromSupabase(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToProduct);
}

async function fetchBySlugFromSupabase(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    // PostgREST returns PGRST116 when no rows found — that's a 404, not a crash
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? rowToProduct(data) : null;
}

// ─── Filter + Sort (pure, derived — no extra fetch needed) ───────────────────

function applyFilters(products: Product[], filters: ProductFilters): Product[] {
  return products.filter((p) => {
    if (filters.category && p.categorySlug !== filters.category) return false;
    if (filters.isFeatured && !p.isFeatured) return false;
    if (filters.isTrending && !p.isTrending) return false;
    if (filters.isNewArrival && !p.isNewArrival) return false;
    if (filters.isOnSale && !p.isOnSale) return false;
    if (filters.inStockOnly && p.stock <= 0) return false;
    if (filters.minPrice !== undefined && p.price < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && p.price > filters.maxPrice) return false;

    if (filters.sizes?.length) {
      if (!filters.sizes.some((s) => p.sizes.includes(s))) return false;
    }
    if (filters.colors?.length) {
      if (!filters.colors.some((c) =>
        p.colors.some((pc) => pc.name.toLowerCase() === c.toLowerCase() || pc.label?.toLowerCase() === c.toLowerCase())
      )) return false;
    }
    if (filters.tags?.length) {
      if (!filters.tags.some((t) => p.tags.includes(t))) return false;
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      const inName = p.name.toLowerCase().includes(q);
      const inDesc = p.description.toLowerCase().includes(q);
      const inShort = p.shortDescription.toLowerCase().includes(q);
      const inTags = p.tags.some((t) => t.toLowerCase().includes(q));
      const inCat = p.category.toLowerCase().includes(q);
      if (!inName && !inDesc && !inShort && !inTags && !inCat) return false;
    }

    return true;
  });
}

function applySort(products: Product[], sort: SortOption): Product[] {
  const arr = [...products];
  switch (sort) {
    case 'newest': return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'oldest': return arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case 'price_asc': return arr.sort((a, b) => a.price - b.price);
    case 'price_desc': return arr.sort((a, b) => b.price - a.price);
    case 'name_asc': return arr.sort((a, b) => a.name.localeCompare(b.name));
    case 'name_desc': return arr.sort((a, b) => b.name.localeCompare(a.name));
    case 'rating_desc': return arr.sort((a, b) => b.rating - a.rating);
    case 'trending': return arr.sort((a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0));
    default: return arr;
  }
}

// ─── Related products (pure) ──────────────────────────────────────────────────
// Priority: same category → shared tags → fallback trending
// Excludes the source product itself.

function deriveRelated(source: Product, all: Product[], limit = MAX_RELATED): Product[] {
  const others = all.filter((p) => p.id !== source.id && p.stock > 0);

  const scored = others.map((p) => {
    let score = 0;
    if (p.categorySlug === source.categorySlug) score += 10;
    const sharedTags = p.tags.filter((t) => source.tags.includes(t)).length;
    score += sharedTags * 3;
    if (p.isTrending) score += 2;
    if (p.isFeatured) score += 1;
    if (p.isNewArrival) score += 1;
    return { product: p, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.product);
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface ProductStore {
  // ── Core state ──────────────────────────────────────────────────────────────
  products: Product[];
  loading: LoadingState;
  hasFetched: boolean;
  cacheTimestamp: number | null;   // Date.now() of last successful full fetch
  error: ProductError | null;

  // ── Slug cache: slug → Product (populated on demand) ───────────────────────
  slugCache: Record<string, Product>;

  // ── Related products cache: productId → Product[] ──────────────────────────
  relatedCache: Record<string, Product[]>;

  // ── Recently viewed product IDs (ordered, newest first) ───────────────────
  recentlyViewedIds: string[];

  // ── Fetch actions ───────────────────────────────────────────────────────────
  /** Safe fetch — skips if already loaded and cache is fresh */
  fetchProducts: () => Promise<void>;
  /** Force fresh fetch — use after admin mutations */
  refetchProducts: () => Promise<void>;
  /**
   * SEO-friendly slug lookup.
   * 1. Checks in-memory products list first (zero network cost if list loaded).
   * 2. Falls back to slug cache (avoids re-fetching already-looked-up slugs).
   * 3. Finally hits Supabase for a precise single-row query.
   * Returns null if not found (caller should show 404).
   */
  getProductBySlug: (slug: string) => Promise<Product | null>;
  /**
   * Returns related products for a given product.
   * Uses relatedCache to avoid recomputing on every render.
   */
  getRelatedProducts: (product: Product, limit?: number) => Product[];

  // ── Recently viewed ─────────────────────────────────────────────────────────
  /** Call this when a product detail page mounts */
  trackProductView: (productId: string) => void;
  /** Returns full Product objects for recently viewed IDs (excludes optional excludeId) */
  getRecentlyViewed: (excludeId?: string, limit?: number) => Product[];
  clearRecentlyViewed: () => void;

  // ── Derived / filtered data (synchronous selectors) ────────────────────────
  /** Apply filters + sort to the full product list */
  getFilteredProducts: (filters: ProductFilters, sort?: SortOption) => Product[];
  /** Convenience selectors */
  getFeaturedProducts: (limit?: number) => Product[];
  getTrendingProducts: (limit?: number) => Product[];
  getNewArrivals: (limit?: number) => Product[];
  getOnSaleProducts: (limit?: number) => Product[];
  getProductsByCategory: (categorySlug: string, limit?: number) => Product[];

  // ── Admin optimistic mutations ───────────────────────────────────────────────
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // ── Internal helpers ─────────────────────────────────────────────────────────
  _isCacheFresh: () => boolean;
  _setError: (code: ProductError['code'], message: string) => void;
  _clearError: () => void;
}

// ─── Store implementation ─────────────────────────────────────────────────────

export const useProductStore = create<ProductStore>()((set, get) => ({
  // ── Initial state ────────────────────────────────────────────────────────────
  products: [],
  loading: { list: false, slug: false, related: false },
  hasFetched: false,
  cacheTimestamp: null,
  error: null,
  slugCache: {},
  relatedCache: {},
  recentlyViewedIds: [],

  // ── Internal helpers ─────────────────────────────────────────────────────────

  _isCacheFresh: () => {
    const { cacheTimestamp } = get();
    if (!cacheTimestamp) return false;
    return Date.now() - cacheTimestamp < CACHE_TTL_MS;
  },

  _setError: (code, message) =>
    set({ error: { code, message, at: Date.now() } }),

  _clearError: () => set({ error: null }),

  // ── Fetch: guarded ───────────────────────────────────────────────────────────

  fetchProducts: async () => {
    const { hasFetched, loading, _isCacheFresh, _setError, _clearError } = get();
    if ((hasFetched && _isCacheFresh()) || loading.list) return;

    _clearError();
    set((s) => ({ loading: { ...s.loading, list: true } }));

    try {
      const products = await fetchAllFromSupabase();
      set({
        products,
        hasFetched: true,
        cacheTimestamp: Date.now(),
        slugCache: {},   // invalidate slug cache on fresh list
        relatedCache: {},   // invalidate related cache
        loading: { list: false, slug: false, related: false },
        error: null,
      });
    } catch (err) {
      console.error('[ProductStore] fetchProducts:', err);
      _setError(
        'FETCH_FAILED',
        err instanceof Error ? err.message : 'Failed to load products',
      );
      set((s) => ({ loading: { ...s.loading, list: false }, hasFetched: true }));
    }
  },

  // ── Fetch: forced ────────────────────────────────────────────────────────────

  refetchProducts: async () => {
    const { _setError, _clearError } = get();
    _clearError();
    set((s) => ({
      loading: { ...s.loading, list: true },
      hasFetched: false,
      cacheTimestamp: null,
    }));

    try {
      const products = await fetchAllFromSupabase();
      set({
        products,
        hasFetched: true,
        cacheTimestamp: Date.now(),
        slugCache: {},
        relatedCache: {},
        loading: { list: false, slug: false, related: false },
        error: null,
      });
    } catch (err) {
      console.error('[ProductStore] refetchProducts:', err);
      _setError(
        'FETCH_FAILED',
        err instanceof Error ? err.message : 'Failed to reload products',
      );
      set((s) => ({ loading: { ...s.loading, list: false }, hasFetched: true }));
    }
  },

  // ── Slug lookup ───────────────────────────────────────────────────────────────

  getProductBySlug: async (slug) => {
    const { products, slugCache, loading, _setError, _clearError } = get();

    // 1. Check in-memory list first (free if products are loaded)
    const fromList = products.find((p) => p.slug === slug);
    if (fromList) {
      // Warm the slug cache as a side-effect
      set((s) => ({ slugCache: { ...s.slugCache, [slug]: fromList } }));
      return fromList;
    }

    // 2. Check slug cache (avoids re-fetching already-seen slugs)
    if (slugCache[slug]) return slugCache[slug];

    // 3. Supabase single-row fetch
    if (loading.slug) return null; // another lookup in flight — caller can retry
    _clearError();
    set((s) => ({ loading: { ...s.loading, slug: true } }));

    try {
      const product = await fetchBySlugFromSupabase(slug);
      if (product) {
        set((s) => ({
          slugCache: { ...s.slugCache, [slug]: product },
          loading: { ...s.loading, slug: false },
        }));
        return product;
      } else {
        _setError('SLUG_NOT_FOUND', `Product not found: ${slug}`);
        set((s) => ({ loading: { ...s.loading, slug: false } }));
        return null;
      }
    } catch (err) {
      console.error('[ProductStore] getProductBySlug:', err);
      _setError(
        'FETCH_FAILED',
        err instanceof Error ? err.message : 'Failed to load product',
      );
      set((s) => ({ loading: { ...s.loading, slug: false } }));
      return null;
    }
  },

  // ── Related products ──────────────────────────────────────────────────────────

  getRelatedProducts: (product, limit = MAX_RELATED) => {
    const { products, relatedCache } = get();
    const cacheKey = `${product.id}:${limit}`;

    if (relatedCache[cacheKey]) return relatedCache[cacheKey];

    const related = deriveRelated(product, products, limit);
    // Cache result as side-effect (synchronous, safe)
    set((s) => ({ relatedCache: { ...s.relatedCache, [cacheKey]: related } }));
    return related;
  },

  // ── Recently viewed ───────────────────────────────────────────────────────────

  trackProductView: (productId) => {
    set((s) => {
      const prev = s.recentlyViewedIds.filter((id) => id !== productId);
      const updated = [productId, ...prev].slice(0, MAX_RECENT);
      return { recentlyViewedIds: updated };
    });
  },

  getRecentlyViewed: (excludeId, limit = 8) => {
    const { products, recentlyViewedIds } = get();
    const productMap = new Map(products.map((p) => [p.id, p]));

    return recentlyViewedIds
      .filter((id) => id !== excludeId)
      .map((id) => productMap.get(id))
      .filter((p): p is Product => !!p)
      .slice(0, limit);
  },

  clearRecentlyViewed: () => set({ recentlyViewedIds: [] }),

  // ── Derived / filtered selectors ──────────────────────────────────────────────

  getFilteredProducts: (filters, sort = 'newest') => {
    const { products } = get();
    const filtered = applyFilters(products, filters);
    return applySort(filtered, sort);
  },

  getFeaturedProducts: (limit = 8) =>
    get().products
      .filter((p) => p.isFeatured && p.stock > 0)
      .slice(0, limit),

  getTrendingProducts: (limit = 8) =>
    get().products
      .filter((p) => p.isTrending && p.stock > 0)
      .slice(0, limit),

  getNewArrivals: (limit = 8) =>
    get().products
      .filter((p) => p.isNewArrival && p.stock > 0)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit),

  getOnSaleProducts: (limit = 8) =>
    get().products
      .filter((p) => p.isOnSale && p.stock > 0)
      .slice(0, limit),

  getProductsByCategory: (categorySlug, limit) =>
    get()
      .products
      .filter((p) => p.categorySlug === categorySlug && p.stock > 0)
      .slice(0, limit),

  // ── Admin optimistic mutations ────────────────────────────────────────────────
  // After calling these, also call refetchProducts() to re-sync from Supabase.

  addProduct: (product) =>
    set((s) => ({
      products: [product, ...s.products],
      relatedCache: {}, // invalidate — new product may affect related sets
    })),

  updateProduct: (id, updates) =>
    set((s) => ({
      products: s.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      slugCache: updates.slug
        ? Object.fromEntries(
          Object.entries(s.slugCache).filter(([k]) => k !== updates.slug),
        )
        : s.slugCache,
      relatedCache: {}, // invalidate — category/tags may have changed
    })),

  deleteProduct: (id) =>
    set((s) => {
      const product = s.products.find((p) => p.id === id);
      const newSlugCache = product
        ? Object.fromEntries(Object.entries(s.slugCache).filter(([k]) => k !== product.slug))
        : s.slugCache;
      return {
        products: s.products.filter((p) => p.id !== id),
        slugCache: newSlugCache,
        relatedCache: {},
        recentlyViewedIds: s.recentlyViewedIds.filter((rid) => rid !== id),
      };
    }),
}));