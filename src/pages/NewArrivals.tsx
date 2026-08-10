/* ===================================================
               New Arrivals Page
   Dedicated page for the newest collection additions
   =================================================== */

declare global { interface Window { dataLayer: any[]; } }
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, Grid2X2, SlidersHorizontal, Sparkles, X } from 'lucide-react';

import { ProductCard } from '@/components/home';
import { FadeIn, Button, Select } from '@/components/ui';
import { useProductStore } from '@/store';
import { useContentStore } from '@/store/contentStore';
import { SITE } from '@/config/siteConfig';
import { BRAND } from '@/config/brandingConfig';
import { Helmet } from 'react-helmet-async';
/* ─── Size options ─── */
const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'];

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
            {banner?.title}
          </h1>
          <p className="text-sm md:text-base mb-0 max-w-xs md:max-w-sm" style={{ color: '#8C7269', lineHeight: '1.7' }}>
            {banner?.subtitle}          </p>
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

  /* ── Filter state ── */
  const [availability, setAvailability] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

  /* ── Derived max price from products ── */
  const maxPrice = useMemo(() => {
    const newArrivals = allProducts.filter(p => p.isNewArrival === true);
    if (newArrivals.length === 0) return 10000;
    return Math.ceil(Math.max(...newArrivals.map(p => Number(p.price) || 0)) / 100) * 100 || 10000;
  }, [allProducts]);

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const filteredProducts = useMemo(() => {
    let filtered = allProducts.filter(p => p.isNewArrival === true);

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    /* Availability */
    if (availability === 'in_stock') {
      filtered = filtered.filter(p => p.stock > 0);
    } else if (availability === 'out_of_stock') {
      filtered = filtered.filter(p => p.stock <= 0);
    }

    /* Sizes */
    if (selectedSizes.length > 0) {
      filtered = filtered.filter(p =>
        Array.isArray(p.sizes) && selectedSizes.some(s => p.sizes.includes(s))
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
  }, [allProducts, searchQuery, availability, selectedSizes, priceRange, sortFilter]);

  const updateSort = (sort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', sort);
    setSearchParams(params);
  };

  const clearFilters = () => {
    setAvailability('all');
    setSelectedSizes([]);
    setPriceRange([0, maxPrice]);
  };

  const activeFilterCount = [
    availability !== 'all',
    selectedSizes.length > 0,
    priceRange[0] > 0 || priceRange[1] < maxPrice,
  ].filter(Boolean).length;

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

  /* ── Shared filter panel content ── */
  const FilterPanel = () => (
    <div className="space-y-7">

      {/* Availability */}
      <div>
        <h3 className="text-sm font-semibold text-charcoal mb-3 uppercase tracking-wider">
          Availability
        </h3>
        <div className="flex flex-col gap-2">
          {(['all', 'in_stock', 'out_of_stock'] as const).map(opt => (
            <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="availability-na"
                checked={availability === opt}
                onChange={() => setAvailability(opt)}
                className="accent-rose-gold w-4 h-4"
              />
              <span className="text-sm text-[#6B5B55]">
                {opt === 'all' ? 'All' : opt === 'in_stock' ? 'In Stock' : 'Out of Stock'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <h3 className="text-sm font-semibold text-charcoal mb-3 uppercase tracking-wider">
          Size
        </h3>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${selectedSizes.includes(size)
                ? 'bg-rose-gold text-white border-rose-gold font-medium'
                : 'border-blush/40 text-[#6B5B55] hover:border-rose-gold'
                }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold text-charcoal mb-3 uppercase tracking-wider">
          Price Range
        </h3>
        <input
          type="range"
          min={0}
          max={maxPrice}
          step={50}
          value={priceRange[1]}
          onChange={e => setPriceRange([0, parseInt(e.target.value)])}
          className="w-full accent-rose-gold"
        />
        <div className="flex justify-between text-sm text-[#6B5B55] mt-1.5">
          <span>{SITE.currency.symbol}0</span>
          <span>{priceRange[1] >= maxPrice ? 'No limit' : `${SITE.currency.symbol}${priceRange[1].toLocaleString()}`}</span></div>
      </div>
    </div>
  );

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
                  <span className="w-5 h-5 bg-rose-gold text-white text-xs rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-rose-gold hover:underline">
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
                >
                  <Grid2X2 size={16} />
                </button>
                <button
                  onClick={() => setGridCols(4)}
                  className={`p-2 rounded-lg ${gridCols === 4 ? 'bg-blush-light' : 'hover:bg-blush-light/50'} transition-colors`}
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
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/40 z-40 md:hidden"
                  onClick={() => setShowFilters(false)}
                />
                <motion.div
                  key="mobile-filter-sheet"
                  initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                  className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white rounded-t-3xl shadow-2xl max-h-[82vh] overflow-y-auto"
                >
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-gray-300" />
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 border-b border-blush/30">
                    <span className="text-base font-semibold text-charcoal">Filters</span>
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
                    <FilterPanel />
                    <div className="flex gap-3 pt-6 pb-safe">
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
                        className="flex-1 py-3 rounded-xl bg-rose-gold text-white text-sm font-semibold hover:bg-deep-rose transition-colors"
                      >
                        Show {filteredProducts.length} Results
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <div className="flex gap-8">

            {/* ── Desktop Sidebar Filter ── */}
            <AnimatePresence>
              {showFilters && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 256, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="hidden md:block flex-shrink-0 overflow-hidden"
                >
                  <div className="w-64">
                    <FilterPanel />
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* ── Products Grid ── */}
            <div className="flex-1">
              {loading ? (
                <div className="text-center py-20">
                  <p className="text-[#6B5B55]">Loading products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                  <h3 className="heading-serif text-2xl font-semibold text-charcoal mb-2">
                    No products found
                  </h3>
                  <p className="text-[#6B5B55] mb-6">
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