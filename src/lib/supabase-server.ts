/* ===================================================
   Server-side Supabase Client
   ===================================================
   For use inside getStaticProps / getServerSideProps
   only — never imported in the browser bundle.

   Uses the service-role key when available (bypasses
   RLS) so ISR builds can read all rows without auth.
   Falls back to the anon key if the service-role key
   is not configured.

   @supabase/supabase-js is lazily require()'d so
   tree-shaking keeps it out of client JS entirely.
   =================================================== */

import type { SupabaseClient } from '@supabase/supabase-js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Shape returned by the products table. */
export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string | null;
  price: number;
  compare_price: number | null;
  images: string[];
  video_url: string | null;
  category: string | null;
  category_slug: string | null;
  category_name: string | null;
  sizes: string[];
  colors: string[];
  stock: number;
  sku: string | null;
  tags: string[];
  seo_title: string | null;
  seo_keywords: string | null;
  custom_text: string | null;
  is_featured: boolean;
  is_trending: boolean;
  is_new_arrival: boolean;
  is_on_sale: boolean;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

/** Shape returned by the categories table. */
export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  product_count: number;
  gradient: string | null;
  parent_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  created_at: string;
}

/** Shape returned by the orders table. */
export interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  transaction_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  shipping_charge: number;
  coupon_code: string | null;
  notes: string | null;
  customer: Record<string, unknown>;
  items: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

/** Shape returned by the coupons table. */
export interface CouponRow {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

// ─── Client factory ───────────────────────────────────────────────────────────

let _cachedClient: SupabaseClient | null = null;

/**
 * Create (or return a cached) Supabase client scoped to the server runtime.
 *
 * - Prefers `SUPABASE_SERVICE_ROLE_KEY` so ISR can bypass RLS.
 * - Falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 * - Session persistence is disabled (no cookies / localStorage in SSR).
 * - The @supabase/supabase-js module is lazy-required so tree-shaking
 *   never includes it in the browser bundle — safe to import from pages
 *   that also have client-side code.
 */
export function getServerSupabase(): SupabaseClient | null {
  if (_cachedClient) return _cachedClient;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !key) return null;

  // Lazy require so this never ships to the browser.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');

  _cachedClient = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _cachedClient;
}

/**
 * Clear the cached server client (useful in tests or after env changes).
 */
export function resetServerSupabase(): void {
  _cachedClient = null;
}

// ─── Query helpers (typed convenience wrappers) ──────────────────────────────

/**
 * Fetch a single product by slug. Returns `null` when not found.
 *
 * Usage in getStaticProps:
 * ```
 * const product = await getProductBySlug('my-product');
 * if (!product) return { notFound: true, revalidate: 60 };
 * ```
 */
export async function getProductBySlug(slug: string): Promise<ProductRow | null> {
  const client = getServerSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data as unknown as ProductRow;
}

/**
 * Fetch multiple products, optionally filtered and ordered.
 *
 * All parameters are optional — omit them to select everything.
 *
 * @example
 * // Latest 8 products in the "dresses" category
 * getProducts({ category: 'dresses', limit: 8, orderBy: { column: 'created_at', ascending: false } })
 *
 * @example
 * // Featured products on sale
 * getProducts({ featured: true, onSale: true })
 */
export async function getProducts(opts?: {
  category?: string;
  featured?: boolean;
  trending?: boolean;
  newArrival?: boolean;
  onSale?: boolean;
  limit?: number;
  orderBy?: { column: string; ascending: boolean };
}): Promise<ProductRow[]> {
  const client = getServerSupabase();
  if (!client) return [];

  let query = client.from('products').select('*');

  if (opts?.category) query = query.eq('category_slug', opts.category);
  if (opts?.featured) query = query.eq('is_featured', true);
  if (opts?.trending) query = query.eq('is_trending', true);
  if (opts?.newArrival) query = query.eq('is_new_arrival', true);
  if (opts?.onSale) query = query.eq('is_on_sale', true);
  if (opts?.orderBy) query = query.order(opts.orderBy.column, { ascending: opts.orderBy.ascending });
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as ProductRow[];
}

/**
 * Fetch all categories (ordered by name).
 */
export async function getCategories(): Promise<CategoryRow[]> {
  const client = getServerSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error || !data) return [];
  return data as unknown as CategoryRow[];
}

/**
 * Fetch a single category by slug.
 */
export async function getCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  const client = getServerSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;
  return data as unknown as CategoryRow;
}

/**
 * Fetch products that share a category with the given product (excludes the
 * product itself). Useful for "Related Products" sections in getStaticProps.
 */
export async function getRelatedProducts(
  productId: string,
  categorySlug: string,
  limit = 8,
): Promise<ProductRow[]> {
  const client = getServerSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('category_slug', categorySlug)
    .neq('id', productId)
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as ProductRow[];
}

/**
 * Validate a coupon code (must be active and not expired).
 * Returns the coupon row, or null if invalid.
 */
export async function validateCoupon(code: string): Promise<CouponRow | null> {
  const client = getServerSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('coupons')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null;
  }

  // Check usage cap
  if (data.max_uses !== null && data.used_count >= data.max_uses) {
    return null;
  }

  return data as unknown as CouponRow;
}

/**
 * Fetch a single order by order number. Useful for order-confirmation / tracking
 * pages that use getServerSideProps.
 */
export async function getOrderByNumber(orderNumber: string): Promise<OrderRow | null> {
  const client = getServerSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single();

  if (error || !data) return null;
  return data as unknown as OrderRow;
}