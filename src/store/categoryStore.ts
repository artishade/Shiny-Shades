import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Category } from '@/types';

// ─── Row ↔ Domain ─────────────────────────────────────────────────────────────

function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    slug: String(row.slug ?? ''),
    description: String(row.description ?? ''),
    image: String(row.image ?? ''),
    productCount: Number(row.product_count ?? 0),
    gradient: String(row.gradient ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

// FIXED: Only assign fields that are explicitly provided to prevent data wiping on updates
function categoryToRow(cat: Partial<Category>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (cat.name !== undefined) row.name = cat.name;
  if (cat.slug !== undefined) row.slug = cat.slug;
  if (cat.description !== undefined) row.description = cat.description;
  if (cat.image !== undefined) row.image = cat.image;
  if (cat.productCount !== undefined) row.product_count = cat.productCount;
  if (cat.gradient !== undefined) row.gradient = cat.gradient;
  return row;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface CategoryStore {
  categories: Category[];
  loading: boolean; // Back to a simple boolean so your UI loaders work correctly!
  hasFetched: boolean;
  error: string | null;

  // Caches for single lookups
  slugCache: Record<string, Category>;
  isSlugLoading: boolean;

  loadCategories: () => Promise<void>;
  reloadCategories: () => Promise<void>; // Added for force-refreshing
  getCategoryBySlug: (slug: string) => Promise<Category | null>;
  addCategory: (category: Omit<Category, 'createdAt'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryStore>()((set, get) => ({
  categories: [],
  loading: false,
  hasFetched: false,
  error: null,

  slugCache: {},
  isSlugLoading: false,

  // ── Fetch ───────────────────────────────────────────────────────────────────
  loadCategories: async () => {
    // If already loading or already fetched, don't do it again
    if (get().loading || get().hasFetched) return;

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({
        categories: (data ?? []).map(rowToCategory),
        loading: false,
        hasFetched: true,
      });
    } catch (err) {
      console.error('[CategoryStore] loadCategories:', err);
      set({
        loading: false,
        hasFetched: true,
        error: err instanceof Error ? err.message : 'Failed to load categories',
      });
    }
  },

  // Force fetch (useful after manual mutations if you want server truth)
  reloadCategories: async () => {
    set({ loading: true, error: null, hasFetched: false });
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      set({
        categories: (data ?? []).map(rowToCategory),
        loading: false,
        hasFetched: true,
        slugCache: {}, // wipe cache to ensure fresh data
      });
    } catch (err) {
      console.error('[CategoryStore] reloadCategories:', err);
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to reload categories',
      });
    }
  },

  // ── Slug Lookup ─────────────────────────────────────────────────────────────
  getCategoryBySlug: async (slug) => {
    const { categories, slugCache } = get();

    // 1. Check if we already have it in the main list
    const fromList = categories.find((c) => c.slug === slug);
    if (fromList) {
      set((s) => ({ slugCache: { ...s.slugCache, [slug]: fromList } }));
      return fromList;
    }

    // 2. Check if we've looked this up recently
    if (slugCache[slug]) return slugCache[slug];

    // 3. Fetch from Supabase
    set({ isSlugLoading: true });
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // PostgREST code for 'Not Found'
        throw error;
      }

      if (data) {
        const category = rowToCategory(data);
        set((s) => ({ slugCache: { ...s.slugCache, [slug]: category } }));
        return category;
      }
      return null;
    } catch (err) {
      console.error('[CategoryStore] getCategoryBySlug:', err);
      return null;
    } finally {
      set({ isSlugLoading: false });
    }
  },

  // ── Add ─────────────────────────────────────────────────────────────────────
  addCategory: async (category) => {
    try {
      // Auto-generate slug if it wasn't provided
      const payload = {
        ...category,
        slug: category.slug || generateSlug(category.name),
      };

      const { data, error } = await supabase
        .from('categories')
        .insert(categoryToRow(payload))
        .select()
        .single();

      if (error) throw error;

      const added = rowToCategory(data);
      set((s) => ({
        categories: [...s.categories, added],
        slugCache: { ...s.slugCache, [added.slug]: added }
      }));
    } catch (err) {
      console.error('[CategoryStore] addCategory:', err);
      throw err; // Let the UI surface this
    }
  },

  // ── Update ───────────────────────────────────────────────────────────────────
  updateCategory: async (id, updates) => {
    try {
      // Update slug automatically if the name changes (and a specific slug wasn't passed)
      const payload = updates.name && !updates.slug
        ? { ...updates, slug: generateSlug(updates.name) }
        : updates;

      const { data, error } = await supabase
        .from('categories')
        .update(categoryToRow(payload))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updated = rowToCategory(data);
      set((s) => {
        // Handle slug cache invalidation if the slug changed
        const oldCategory = s.categories.find((c) => c.id === id);
        const newSlugCache = { ...s.slugCache };
        if (oldCategory && oldCategory.slug !== updated.slug) {
          delete newSlugCache[oldCategory.slug];
        }
        newSlugCache[updated.slug] = updated;

        return {
          categories: s.categories.map((c) => (c.id === id ? updated : c)),
          slugCache: newSlugCache
        };
      });
    } catch (err) {
      console.error('[CategoryStore] updateCategory:', err);
      throw err;
    }
  },

  // ── Delete ───────────────────────────────────────────────────────────────────
  deleteCategory: async (id) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((s) => {
        const deleted = s.categories.find((c) => c.id === id);
        const newSlugCache = { ...s.slugCache };
        if (deleted) delete newSlugCache[deleted.slug];

        return {
          categories: s.categories.filter((c) => c.id !== id),
          slugCache: newSlugCache
        };
      });
    } catch (err) {
      console.error('[CategoryStore] deleteCategory:', err);
      throw err;
    }
  },
}));