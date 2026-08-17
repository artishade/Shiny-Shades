/* ===================================================
               New Arrivals Page
   Dedicated page for the newest collection additions
   with dynamic auto-detected filters
   =================================================== */

declare global { interface Window { dataLayer: any[]; } }
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, Grid2X2, SlidersHorizontal, X } from 'lucide-react';

import { ProductCard } from '@/components/home';
import { FadeIn, Button, Select } from '@/components/ui';
import { ProductFilterPanel, extractAvailableFilters } from '@/components/shop/ProductFilter';
import { useProductStore } from '@/store';
import { useContentStore } from '@/store/contentStore';
import { Helmet } from 'react-helmet-async';

/* ─────────────────────────────────────────────
   NEW ARRIVALS HERO BANNER
───────────────────────────────────────────── */
export const NewArrivalsHero: React.FC<{
  banner?: {
    title?: string;
    subtitle?: string;
    imageUrl?: string;
    imageUrlMobile?: string;
    videoUrl?: string;
    mediaType?: 'gradient' | 'image' | 'video';
    gradient?: string;
  };
}> = ({ banner }) => {
  const mediaType = banner?.mediaType ?? (banner?.videoUrl ? 'video' : banner?.imageUrl ? 'image' : 'gradient');

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-10 rounded-3xl overflow-hidden min-h-[200px] md:min-h-[240px]"
      style={
        mediaType !== 'image' && mediaType !== 'video'
          ? { background: banner?.gradient || 'linear-gradient(135deg, #F5E6DC 0%, #EDD5C5 40%, #E8C9B8 100%)' }
          : undefined
      }
    >
      {mediaType === 'image' && banner?.imageUrl && (
        <>
          {banner.imageUrlMobile && (
            <div
              className="absolute inset-0 block md:hidden"
              style={{ backgroundImage: `url(${banner.imageUrlMobile})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
          )}
          <div
            className={`absolute inset-0 ${banner.imageUrlMobile ? 'hidden md:block' : 'block'}`}
            style={{
              backgroundImage: `url(${banner.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: banner.imageUrlMobile ? 'center' : 'center 30%',
            }}
          />
        </>
      )}
      {mediaType === 'video' && banner?.videoUrl && (
        <video
          src={banner.videoUrl}
          className="absolute inset-0 w-full h-full object-cover z-0"
          muted loop autoPlay playsInline
        />
      )}
      <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #B07D6B 0%, transparent 70%)' }} />
      <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #C4956A 0%, transparent 70%)' }} />
      <div className="absolute top-0 left-0 right-0 h-px opacity-30" style={{ background: '#B07D6B' }} />

      <div className="relative z-10 px-8 md:px-16 py-8 md:py-10 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 text-center md:text-left">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-light mb-4 leading-tight" style={{ color: '#2C2C2C' }}>
            {banner?.title || 'New Arrivals'}
          </h1>
          <p className="text-sm md:text-base mb-0 max-w-xs md:max-w-sm" style={{ color: '#8C7269', lineHeight: '1.7' }}>
            {banner?.subtitle || 'Explore our newest pieces designed to elevate your elegance.'}
          </p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px opacity-30" style={{ background: '#B07D6B' }} />
    </motion.div>
  );
};

/* ─────────────────────────────────────────────
   NEW ARRIVALS PAGE
───────────────────────────────────────────── */
export const NewArrivalsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { content } = useContentStore();

  const {
    products: allProducts,
    fetchProducts,
    loading: { list: loading },
  } = useProductStore();

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const [showFilters, setShowFilters] = useState(false);
  const [gridCols, setGridCols] = useState<3 | 4>(4);

  const sortFilter = searchParams.get('sort') || 'newest';
  const searchQuery = searchParams.get('q') || '';

  // Base list of new arrival products
  const baseNewArrivals = useMemo(() => {
    return allProducts.filter(p => p.isNewArrival === true);
  }, [allProducts]);

  // Dynamic filter options extracted from the current new arrivals
  const availableFilters = useMemo(() => {
    return extractAvailableFilters(baseNewArrivals);
  }, [baseNewArrivals]);

  /* ── Filter state ── */
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

  // Sync initial price range once products load
  useEffect(() => {
    if (availableFilters.maxPrice > 0) {
      setPriceRange([availableFilters.minPrice, availableFilters.maxPrice]);
    }
  }, [availableFilters.minPrice, availableFilters.maxPrice]);

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
    let filtered = [...baseNewArrivals];

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
        Array.isArray(p.tags) && selectedStyles.some(t => selectedStyles.includes(t))
      );
    }

    /* Price */
    filtered = filtered.filter(p => {
      const price = Number(p.price) || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    /* Sort */
    switch (sortFilter) {
      case 'price_asc':
        filtered.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case 'price_desc':
        filtered.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case 'featured':
        filtered.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
    }

    return filtered;
  }, [
    baseNewArrivals,
    searchQuery,
    selectedCategories,
    selectedSizes,
    selectedColors,
    selectedStyles,
    priceRange,
    sortFilter,
  ]);

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
        item_list_name: 'New Arrivals',
        items: filteredProducts.slice(0, 20).map((p, i) => ({
          item_id: p.id,
          item_name: p.name,
          item_category: p.category || '',
          price: Number(p.price) || 0,
          index: i,
        })),
      },
    });
  }, [filteredProducts]);

  return (
    <>
      <Helmet>
        <title>New Arrivals | Shiny Shades — Latest Women's Fashion</title>
        <meta name="description" content="Shop the latest arrivals at Shiny Shades. Fresh styles in lingerie, dresses, and women's fashion — new drops every week." />
        <link rel="canonical" href="https://shinyshades.vercel.app/new-arrivals" />
      </Helmet>
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Hero Banner */}
          {content.newArrivalBanners?.[0]?.active !== false && (
            <NewArrivalsHero banner={content.newArrivalBanners?.[0]} />
          )}

          {/* Piece count */}
          <FadeIn>
            <p className="text-[#6B5B55] text-sm mb-6 -mt-4">
              {filteredProducts.length}{' '}{filteredProducts.length === 1 ? 'piece' : 'pieces'} found
            </p>
          </FadeIn>

          {/* ── Toolbar ── */}
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            {/* Left: Filter toggle */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
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
                <button onClick={clearFilters} className="text-xs text-rose-gold hover:underline font-medium">
                  Clear all
                </button>
              )}
            </div>

            {/* Right: Sort dropdown + grid toggle */}
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
                  onClick={() => setGridCols(3)}
                  className={`p-2 rounded-lg ${gridCols === 3 ? 'bg-blush-light' : 'hover:bg-blush-light/50'} transition-colors`}
                  aria-label="3 columns grid"
                >
                  <Grid2X2 size={16} />
                </button>
                <button
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
                      products={baseNewArrivals}
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
                        Show {filteredProducts.length} Results
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
                      products={baseNewArrivals}
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
                  <p className="text-[#6B5B55]">Loading new arrivals...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-[#FFF8F6]/40 rounded-3xl border border-blush/30 px-4">
                  <h3 className="heading-serif text-2xl font-semibold text-charcoal mb-2">
                    No products found
                  </h3>
                  <p className="text-[#6B5B55] mb-6 max-w-sm mx-auto">
                    No new arrivals matching your filters. Check back soon!
                  </p>
                  <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
                </div>
              ) : (
                <motion.div
                  layout
                  className={`grid gap-4 md:gap-6 ${gridCols === 3
                    ? 'grid-cols-2 md:grid-cols-3'
                    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                    }`}
                >
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.3) }}
                    >
                      <ProductCard product={product} priority={index < 4} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
};