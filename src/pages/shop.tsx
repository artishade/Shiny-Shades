/* ===================================================
                 Shop Page (Scattered Multi-Image + Infinite Scroll)
   General collection browser with dynamic filters, sorting & deterministic scattered cards
   =================================================== */

declare global { interface Window { dataLayer: any[]; } }
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from '@/lib/routerCompat';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, Grid2X2, SlidersHorizontal, X } from 'lucide-react';
import type { GetStaticProps } from 'next';

import { ProductCard } from '@/components/home';
import { Button, Select } from '@/components/ui';
import { ProductFilterPanel, extractAvailableFilters } from '@/components/shop/ProductFilter';
import { ShopCategoryMarquee } from '@/components/shop/ShopCategoryMarquee';
import {
  useProductStore,
  usePrerenderedProducts,
  rowToProduct,
  PRODUCT_LIST_COLUMNS,
} from '@/store/productStore';
import { rowToCategory } from '@/store/categoryStore';
import { mergeWithDefaults, CONTENT_ROW_ID } from '@/store/contentStore';
import type { PageInitialData } from '@/types/layout';
import Head from 'next/head';

// 24 is ideal for 2, 3, or 4 columns grid
const BATCH_SIZE = 24;

type ShopCard = { product: any; imageIndex: number; score?: number };

/* ─── Deterministic Scattered Cards Builder ───
   Explodes each product into individual image cards and spaces out 
   the same product's images so they never appear side-by-side. */
const buildScatteredCards = (products: any[]): ShopCard[] => {
  if (!products || products.length === 0) return [];

  // Optimal spacing offset: at least 7 items between images of the same product
  const offset = Math.max(7, Math.floor(products.length / 2));

  const allCards: (ShopCard & { pId: string; score: number })[] = [];

  products.forEach((product, pIdx) => {
    const images = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [''];

    images.forEach((_: string, imgIdx: number) => {
      // Deterministic priority score: spaces out each image index predictably
      const score = pIdx + (imgIdx * offset) + (imgIdx * 0.01);
      allCards.push({
        product,
        imageIndex: imgIdx,
        pId: String(product.id),
        score,
      });
    });
  });

  // Sort deterministically by score, then product id, then image index
  allCards.sort((a, b) => a.score - b.score || a.pId.localeCompare(b.pId) || a.imageIndex - b.imageIndex);

  // Safety pass: if any adjacent cards ever share the exact same product ID, push it forward
  for (let i = 1; i < allCards.length; i++) {
    if (allCards[i].pId === allCards[i - 1].pId) {
      for (let j = i + 1; j < allCards.length; j++) {
        if (allCards[j].pId !== allCards[i - 1].pId) {
          const temp = allCards[i];
          allCards[i] = allCards[j];
          allCards[j] = temp;
          break;
        }
      }
    }
  }

  return allCards.map(({ product, imageIndex }) => ({ product, imageIndex }));
};

/* ─────────────────────────────────────────────
   MAIN SHOP PAGE
───────────────────────────────────────────── */
export const ShopPage: React.FC<PageInitialData> = ({ initialProducts }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Prerendered rows paint the grid on the first frame; the shared store takes
  // over as soon as _app's hydrateStores commits. This page used to keep its own
  // useState copy and its own select('*') on mount, so arriving from anywhere
  // else refetched the whole catalogue a second time.
  const { products, ready } = usePrerenderedProducts(initialProducts);
  const listLoading = useProductStore((s) => s.loading.list);
  const fetchProducts = useProductStore((s) => s.fetchProducts);
  const loading = !ready && listLoading;

  const [showFilters, setShowFilters] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4>(4);

  // How many cards currently rendered
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const observerTarget = useRef<HTMLDivElement | null>(null);

  const sortFilter = searchParams.get('sort') || 'newest';
  const searchQuery = searchParams.get('q') || '';
  const filterParam = searchParams.get('filter') || '';

  /* ── Filter state ── */
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

  // Background refresh — stock and prices must not sit on an ISR snapshot for a
  // whole revalidate window. No-ops while the store's 5-minute cache is fresh.
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (filterParam === 'trending') {
      setSelectedStyles(['Trending']);
    }
    if (searchParams.get('featured') === 'true') {
      setSelectedStyles(['Featured']);
    }
  }, [filterParam, searchParams]);

  // Reset infinite scroll count whenever filters, query or sorting changes
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [searchQuery, selectedCategories, selectedSizes, selectedColors, selectedStyles, priceRange, sortFilter]);

  // Available filters extracted dynamically from base product pool
  const availableFilters = useMemo(() => extractAvailableFilters(products), [products]);

  // Widen the slider to the real catalogue bounds once, when products first land.
  const priceBoundsSeeded = useRef(false);
  useEffect(() => {
    if (priceBoundsSeeded.current || products.length === 0) return;
    priceBoundsSeeded.current = true;
    setPriceRange([availableFilters.minPrice, availableFilters.maxPrice]);
  }, [products.length, availableFilters.minPrice, availableFilters.maxPrice]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev =>
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    /* Categories */
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(p => selectedCategories.includes(p.category));
    }

    /* Sizes */
    if (selectedSizes.length > 0) {
      filtered = filtered.filter(p =>
        Array.isArray(p.sizes) && selectedSizes.some(s => p.sizes.includes(s))
      );
    }

    /* Colors */
    if (selectedColors.length > 0) {
      filtered = filtered.filter(p =>
        Array.isArray(p.colors) &&
        p.colors.some((c: any) => {
          const name = typeof c === 'string' ? c : (c?.name || c?.label || c?.color || '');
          return selectedColors.includes(name);
        })
      );
    }

    /* Styles / Tags */
    if (selectedStyles.length > 0) {
      filtered = filtered.filter(p =>
        (Array.isArray(p.tags) && selectedStyles.some(t => p.tags.includes(t))) ||
        (selectedStyles.includes('Trending') && p.isTrending) ||
        (selectedStyles.includes('Featured') && p.isFeatured)
      );
    }

    /* Price */
    filtered = filtered.filter(p => {
      const price = Number(p.price) || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    /* Deterministic Sort */
    switch (sortFilter) {
      case 'price_asc':
        filtered.sort((a, b) => Number(a.price) - Number(b.price) || String(a.id).localeCompare(String(b.id)));
        break;
      case 'price_desc':
        filtered.sort((a, b) => Number(b.price) - Number(a.price) || String(a.id).localeCompare(String(b.id)));
        break;
      case 'featured':
        filtered.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || String(a.id).localeCompare(String(b.id)));
        break;
    }

    return filtered;
  }, [
    products,
    searchQuery,
    selectedCategories,
    selectedSizes,
    selectedColors,
    selectedStyles,
    priceRange,
    sortFilter,
  ]);

  // Explode products into multiple spaced image cards deterministically
  const scatteredCards = useMemo(() => buildScatteredCards(filteredProducts), [filteredProducts]);

  // Current batch of scattered cards to display
  const visibleCards = useMemo(
    () => scatteredCards.slice(0, visibleCount),
    [scatteredCards, visibleCount]
  );

  // Intersection Observer for Infinite Scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < scatteredCards.length) {
          setVisibleCount(prev => Math.min(prev + BATCH_SIZE, scatteredCards.length));
        }
      },
      { threshold: 0.1, rootMargin: '250px' } // Preload 250px before bottom
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [visibleCount, scatteredCards.length]);

  const updateSort = (sort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', sort);
    setSearchParams(params);
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('sort');
    setSearchParams(params);
    setSelectedCategories([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedStyles([]);
    setPriceRange([availableFilters.minPrice, availableFilters.maxPrice]);
  };

  const pageTitle = searchQuery ? `Search: "${searchQuery}"` : 'Shop';

  const isPriceModified =
    priceRange[0] > availableFilters.minPrice ||
    priceRange[1] < availableFilters.maxPrice;

  const activeFilterCount =
    selectedCategories.length +
    selectedSizes.length +
    selectedColors.length +
    selectedStyles.length +
    (isPriceModified ? 1 : 0);

  /* GTM */
  useEffect(() => {
    if (filteredProducts.length === 0) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: 'view_item_list',
      ecommerce: {
        item_list_name: pageTitle,
        items: filteredProducts.slice(0, 24).map((p, i) => ({
          item_id: p.id,
          item_name: p.name,
          item_category: p.category || '',
          price: Number(p.price) || 0,
          index: i,
        })),
      },
    });
  }, [filteredProducts, pageTitle]);

  return (
    <>
      <Head>
        <title>Shop All | Shiny Shades — Premium Women&apos;s Fashion Bangladesh</title>
        <meta name="description" content="Browse Shiny Shades's full collection of premium women's fashion including dresses, tops, and more. Free delivery across Bangladesh." />
        <link rel="canonical" href="https://www.shinyshades.store/shop" />
      </Head>
      <div className="min-h-screen pt-4 pb-16">
        <h1 className="sr-only">{pageTitle}</h1>
        <ShopCategoryMarquee />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Toolbar ── */}
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            {/* Left: Filter toggle */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <SlidersHorizontal size={16} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-rose-gold text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-rose-gold hover:underline font-medium"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Right: Sort + grid toggle */}
            <div className="flex items-center gap-3">
              <Select
                options={[
                  { value: 'newest', label: 'Newest First' },
                  { value: 'featured', label: 'Featured' },
                  { value: 'price_asc', label: 'Price: Low to High' },
                  { value: 'price_desc', label: 'Price: High to Low' },
                ]}
                value={sortFilter}
                onChange={e => updateSort(e.target.value)}
                className="!py-2 text-sm"
              />
              <div className="hidden md:flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setGridCols(3)}
                  className={`p-2 rounded-lg ${gridCols === 3 ? 'bg-blush-light' : 'hover:bg-blush-light/50'} transition-colors`}
                  aria-label="3 columns grid"
                >
                  <Grid2X2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setGridCols(4)}
                  className={`p-2 rounded-lg ${gridCols === 4 ? 'bg-blush-light' : 'hover:bg-blush-light/50'} transition-colors`}
                  aria-label="4 columns grid"
                >
                  <Grid3X3 size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Mobile Filter Bottom Sheet ── */}
          <AnimatePresence>
            {showFilters && (
              <>
                <motion.div
                  key="mobile-filter-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/40 z-40 md:hidden"
                  onClick={() => setShowFilters(false)}
                />
                <motion.div
                  key="mobile-filter-sheet"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                  className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
                >
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-gray-300" />
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 border-b border-blush/30">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-charcoal">Filters</span>
                      {activeFilterCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-gold text-white text-xs font-semibold">
                          {activeFilterCount}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFilters(false)}
                      className="p-1.5 rounded-full hover:bg-blush-light transition-colors"
                      aria-label="Close filters"
                    >
                      <X size={18} className="text-[#6B5B55]" />
                    </button>
                  </div>
                  <div className="px-5 py-5">
                    <ProductFilterPanel
                      products={products}
                      selectedCategories={selectedCategories}
                      onToggleCategory={toggleCategory}
                      selectedSizes={selectedSizes}
                      onToggleSize={toggleSize}
                      selectedColors={selectedColors}
                      onToggleColor={toggleColor}
                      selectedStyles={selectedStyles}
                      onToggleStyle={toggleStyle}
                      priceRange={priceRange}
                      onPriceChange={setPriceRange}
                      sort={sortFilter}
                      onSortChange={updateSort}
                      onClearAll={clearFilters}
                      activeFilterCount={activeFilterCount}
                    />
                    <div className="flex gap-3 pt-6 pb-safe border-t border-blush/30 mt-6">
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="flex-1 py-3 rounded-xl border-2 border-blush/40 text-sm font-medium text-[#6B5B55] hover:border-rose-gold transition-colors"
                      >
                        Clear All
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowFilters(false)}
                        className="flex-1 py-3 rounded-xl bg-rose-gold text-white text-sm font-semibold hover:bg-deep-rose shadow-md shadow-rose-gold/20 transition-colors"
                      >
                        Show {scatteredCards.length} Results
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <div className="flex gap-8 items-start">

            {/* ── Desktop Sidebar Filter ── */}
            <AnimatePresence>
              {showFilters && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="hidden md:block flex-shrink-0 overflow-hidden sticky top-28 bg-[#FFF8F6]/60 p-5 rounded-2xl border border-blush/40"
                >
                  <div className="w-[240px]">
                    <ProductFilterPanel
                      products={products}
                      selectedCategories={selectedCategories}
                      onToggleCategory={toggleCategory}
                      selectedSizes={selectedSizes}
                      onToggleSize={toggleSize}
                      selectedColors={selectedColors}
                      onToggleColor={toggleColor}
                      selectedStyles={selectedStyles}
                      onToggleStyle={toggleStyle}
                      priceRange={priceRange}
                      onPriceChange={setPriceRange}
                      sort={sortFilter}
                      onSortChange={updateSort}
                      onClearAll={clearFilters}
                      activeFilterCount={activeFilterCount}
                    />
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* ── Products Grid ── */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="text-center py-20">
                  <div className="inline-block animate-spin w-8 h-8 border-3 border-rose-gold border-t-transparent rounded-full mb-3" />
                  <p className="text-[#6B5B55]">Loading collection...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-[#FFF8F6]/40 rounded-3xl border border-blush/30 px-4">
                  <h3 className="heading-serif text-2xl font-semibold text-charcoal mb-2">
                    No products found
                  </h3>
                  <p className="text-[#6B5B55] mb-6 max-w-sm mx-auto">
                    Try adjusting your filters or search terms to see available pieces
                  </p>
                  <Button variant="outline" type="button" onClick={clearFilters}>Clear Filters</Button>
                </div>
              ) : (
                <>
                  <div
                    className={`grid gap-4 md:gap-6 ${gridCols === 3
                      ? 'grid-cols-2 md:grid-cols-3'
                      : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                      }`}
                  >
                    {visibleCards.map(({ product, imageIndex }, index) => (
                      <motion.div
                        key={`${product.id}-${imageIndex}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min((index % BATCH_SIZE) * 0.03, 0.25) }}
                      >
                        <ProductCard product={product} priority={index < 4} imageIndex={imageIndex} />
                      </motion.div>
                    ))}
                  </div>

                  {/* ── Infinite Scroll Observer & Loading Indicator ── */}
                  {visibleCount < scatteredCards.length && (
                    <div
                      ref={observerTarget}
                      className="py-12 text-center flex flex-col items-center justify-center gap-2"
                    >
                      <div className="inline-block animate-spin w-7 h-7 border-2 border-rose-gold border-t-transparent rounded-full" />
                      <p className="text-xs text-[#6B5B55] font-medium tracking-wide">
                        Loading more pieces ({visibleCount} of {scatteredCards.length})...
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

ShopPage.getLayout = function getLayout(page: React.ReactElement) {
  return <CustomerLayout>{page}</CustomerLayout>;
};

// ─── ISR ──────────────────────────────────────────────────────────────────────
// /shop was fully client-side: an empty shell plus a spinner until a browser
// round trip to Supabase came back. The catalogue is baked into the HTML instead,
// and _app pushes it into the stores so the shell fills in too. See index.tsx.

/** Service-role key first so builds bypass RLS; anon as fallback. */
const getServerSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key, { auth: { persistSession: false } });
};

const REVALIDATE_SECONDS = 60;

export const getStaticProps: GetStaticProps<PageInitialData> = async () => {
  const sb = getServerSupabase();
  if (!sb) return { props: {}, revalidate: REVALIDATE_SECONDS };

  try {
    const [contentRes, categoryRes, productRes] = await Promise.all([
      sb.from('site_content').select('content').eq('id', CONTENT_ROW_ID).maybeSingle(),
      sb.from('categories').select('*').order('created_at', { ascending: true }),
      sb
        .from('products')
        .select(PRODUCT_LIST_COLUMNS)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
    ]);

    const props: PageInitialData = {
      initialContent: contentRes.data?.content ? mergeWithDefaults(contentRes.data.content) : null,
      initialCategories: (categoryRes.data ?? []).map(rowToCategory),
      initialProducts: (productRes.data ?? []).map(rowToProduct),
    };

    // Next refuses `undefined` in props — rowToProduct leaves comparePrice undefined.
    return { props: JSON.parse(JSON.stringify(props)), revalidate: REVALIDATE_SECONDS };
  } catch (err) {
    console.error('[Shop getStaticProps]', err);
    return { props: {}, revalidate: REVALIDATE_SECONDS };
  }
};

export default ShopPage;
