/* ===================================================
                   Search Page
   FIXED: Now searches Supabase products via useProductStore
   ENHANCED:
   - Dynamic SEO via Helmet
   - Cookie-based search history
   - Live search suggestions while typing
   - Trending suggestions fallback
   - Better empty states
   =================================================== */
declare global { interface Window { dataLayer: any[]; } }
import { CustomerLayout } from '@/components/layout/CustomerLayout';
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from '@/lib/routerCompat';
import { m as motion } from 'framer-motion';
import { Search as SearchIcon, ArrowRight, Clock, X, TrendingUp } from 'lucide-react';
import Head from 'next/head';
import type { GetStaticProps } from 'next';
import { ProductCard } from '@/components/home';
import { Button, EmptyState } from '@/components/ui';
import {
  useProductStore,
  usePrerenderedProducts,
  rowToProduct,
  PRODUCT_LIST_COLUMNS,
} from '@/store/productStore';
import { rowToCategory } from '@/store/categoryStore';
import { mergeWithDefaults, CONTENT_ROW_ID } from '@/store/contentStore';
import type { PageInitialData } from '@/types/layout';
import { siteConfig } from '@/config/siteConfig';

/* ─── Cookie helpers for search history ─── */
const HISTORY_COOKIE = 'ag_search_history';
const HISTORY_MAX = 8;

const getCookie = (name: string): string => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
};

const setCookie = (name: string, value: string, days: number = 90) => {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
};

const getSearchHistory = (): string[] => {
  const raw = getCookie(HISTORY_COOKIE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const addToSearchHistory = (term: string): string[] => {
  const trimmed = term.trim();
  if (!trimmed) return getSearchHistory();
  const current = getSearchHistory().filter(t => t.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...current].slice(0, HISTORY_MAX);
  setCookie(HISTORY_COOKIE, JSON.stringify(updated));
  return updated;
};

const removeFromSearchHistory = (term: string): string[] => {
  const updated = getSearchHistory().filter(t => t !== term);
  setCookie(HISTORY_COOKIE, JSON.stringify(updated));
  return updated;
};

const clearSearchHistory = (): string[] => {
  setCookie(HISTORY_COOKIE, JSON.stringify([]));
  return [];
};

export const SearchPage: React.FC<PageInitialData> = ({ initialProducts }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(query);

  // Prerendered rows so a shared /search?q=… link has results in the HTML; the
  // store takes over once _app's hydrateStores commits. Selector reads instead of
  // the whole store, which re-rendered this framer-motion grid on every store write.
  const { products } = usePrerenderedProducts(initialProducts);
  const fetchProducts = useProductStore((s) => s.fetchProducts);

  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Background refresh — stock and prices must not sit on an ISR snapshot.
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Load search history from cookie on mount
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // Sync input with URL changes (e.g. from navbar search)
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.shortDescription?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      (p.tags && p.tags.some((t: string) => t.toLowerCase().includes(q)))
    );
  }, [query, products]);

  /* ─── Live suggestions while typing (before submit) ─── */
  const suggestions = useMemo(() => {
    const q = inputValue.toLowerCase().trim();
    if (!q || q === query.toLowerCase().trim()) return [];

    const matches = products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      (p.tags && p.tags.some((t: string) => t.toLowerCase().includes(q)))
    );

    // Unique product name suggestions, capped
    return Array.from(new Set(matches.map(p => p.name))).slice(0, 5);
  }, [inputValue, query, products]);

  /* ─── Popular/trending search terms as fallback suggestions ─── */
  const trendingSuggestions = useMemo(() => {
    return Array.from(
      new Set(
        products
          .filter(p => p.isTrending)
          .map(p => p.name)
      )
    ).slice(0, 5);
  }, [products]);

  /* GTM DATA LAYER — search */
  useEffect(() => {
    if (!query.trim()) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'search',
      search_term: query.trim(),
      search_results_count: results.length,
    });
  }, [query, results.length]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setSearchHistory(addToSearchHistory(inputValue.trim()));
      setSearchParams({ q: inputValue.trim() });
    } else {
      setSearchParams({});
    }
    setShowDropdown(false);
  };

  const handleSuggestionClick = (term: string) => {
    setInputValue(term);
    setSearchHistory(addToSearchHistory(term));
    setSearchParams({ q: term });
    setShowDropdown(false);
  };

  const handleRemoveHistoryItem = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory(removeFromSearchHistory(term));
  };

  const handleClearHistory = () => {
    setSearchHistory(clearSearchHistory());
  };

  return (
    <>
      <Head>
        <title>
          {query
            ? `${results.length} results for "${query}" | ${siteConfig.websiteName}`
            : `Search | ${siteConfig.websiteName}`}
        </title>
        <meta
          name="description"
          content={
            query
              ? `Search results for "${query}" — found ${results.length} ${results.length === 1 ? 'item' : 'items'} at ${siteConfig.websiteName}.`
              : siteConfig.defaultDescription
          }
        />
        <meta name="robots" content="noindex, follow" />
      </Head>

      <div className="min-h-screen pt-12 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-4 relative">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B5B55]" />
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Search for dresses, tops, skirts..."
                  className="w-full pl-12 pr-12 py-4 rounded-2xl border border-blush/30 bg-white/80 text-lg focus:outline-none focus:ring-2 focus:ring-rose-gold/30 focus:border-rose-gold transition-all"
                  autoFocus
                />
                {inputValue && (
                  <button
                    type="button"
                    onClick={() => { setInputValue(''); setSearchParams({}); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B5B55] hover:text-charcoal"
                    aria-label="Clear search input"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </form>

            {/* Dropdown: suggestions + history */}
            {showDropdown && (
              <div className="absolute left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm border border-blush/30 rounded-2xl shadow-lg z-20 overflow-hidden">

                {/* Live product suggestions while typing */}
                {inputValue.trim() && suggestions.length > 0 && (
                  <div className="py-2">
                    <p className="px-4 pt-1 pb-1 text-xs font-semibold text-[#6B5B55] uppercase tracking-wider">
                      Suggestions
                    </p>
                    {suggestions.map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleSuggestionClick(name)}
                        className="flex items-center justify-between w-full px-4 py-2 text-sm text-charcoal hover:bg-blush-light/50 transition-colors text-left"
                      >
                        <span className="flex items-center gap-2">
                          <SearchIcon size={14} className="text-[#6B5B55]" />
                          {name}
                        </span>
                        <ArrowRight size={14} className="text-[#6B5B55]" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Recent search history */}
                {!inputValue.trim() && searchHistory.length > 0 && (
                  <div className="py-2">
                    <div className="flex items-center justify-between px-4 pt-1 pb-1">
                      <p className="text-xs font-semibold text-[#6B5B55] uppercase tracking-wider">
                        Recent Searches
                      </p>
                      <button
                        type="button"
                        onClick={handleClearHistory}
                        className="text-xs text-rose-gold hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                    {searchHistory.map(term => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => handleSuggestionClick(term)}
                        className="flex items-center justify-between w-full px-4 py-2 text-sm text-charcoal hover:bg-blush-light/50 transition-colors text-left"
                      >
                        <span className="flex items-center gap-2">
                          <Clock size={14} className="text-[#6B5B55]" />
                          {term}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveHistoryItem(term, e)}
                          className="text-[#6B5B55] hover:text-charcoal"
                          aria-label={`Remove ${term} from history`}
                        >
                          <X size={14} />
                        </button>
                      </button>
                    ))}
                  </div>
                )}

                {/* Trending fallback when no history and no input */}
                {!inputValue.trim() && searchHistory.length === 0 && trendingSuggestions.length > 0 && (
                  <div className="py-2">
                    <p className="px-4 pt-1 pb-1 text-xs font-semibold text-[#6B5B55] uppercase tracking-wider">
                      Trending Now
                    </p>
                    {trendingSuggestions.map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleSuggestionClick(name)}
                        className="flex items-center justify-between w-full px-4 py-2 text-sm text-charcoal hover:bg-blush-light/50 transition-colors text-left"
                      >
                        <span className="flex items-center gap-2">
                          <TrendingUp size={14} className="text-[#6B5B55]" />
                          {name}
                        </span>
                        <ArrowRight size={14} className="text-[#6B5B55]" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Nothing to show */}
                {inputValue.trim() && suggestions.length === 0 && (
                  <div className="px-4 py-3 text-sm text-[#6B5B55]">
                    Press Enter to search for &quot;{inputValue.trim()}&quot;
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mb-8" />

          {/* Results */}
          {query && (
            <div>
              <h2 className="heading-serif text-2xl font-bold text-charcoal mb-2">
                {results.length} {results.length === 1 ? 'result' : 'results'} for &quot;{query}&quot;
              </h2>
              <div className="luxury-line mb-8 w-16" />

              {results.length === 0 ? (
                <div>
                  <EmptyState
                    icon={<SearchIcon size={48} />}
                    title="No results found"
                    description={`We couldn't find anything matching "${query}". Try checking your spelling, using fewer or more general keywords, or browse our collections below.`}
                    action={<Button onClick={() => { setInputValue(''); setSearchParams({}); }}>Clear Search</Button>}
                  />
                  {trendingSuggestions.length > 0 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-[#6B5B55] mb-3">You might like:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {trendingSuggestions.map(name => (
                          <button
                            key={name}
                            onClick={() => handleSuggestionClick(name)}
                            className="px-4 py-2 text-sm rounded-full bg-blush-light/50 text-charcoal hover:bg-blush-light transition-colors"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {results.flatMap((product, index) =>
                    (product.images?.length ? product.images : ['']).map((_, imgIdx) => (
                      <motion.div
                        key={`${product.id}-${imgIdx}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ProductCard product={product} imageIndex={imgIdx} />
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {!query && (
            <div className="text-center py-12">
              <h2 className="heading-serif text-3xl font-bold text-charcoal mb-4">What are you looking for?</h2>
              <p className="text-[#6B5B55] mb-6">Search for products by name, category, or style</p>

              {searchHistory.length > 0 && (
                <div className="mb-8">
                  <p className="text-sm text-[#6B5B55] mb-3">Recent searches</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {searchHistory.map(term => (
                      <button
                        key={term}
                        onClick={() => handleSuggestionClick(term)}
                        className="px-4 py-2 text-sm rounded-full bg-blush-light/50 text-charcoal hover:bg-blush-light transition-colors flex items-center gap-1.5"
                      >
                        <Clock size={12} />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {trendingSuggestions.length > 0 && (
                <div>
                  <p className="text-sm text-[#6B5B55] mb-3">Trending</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {trendingSuggestions.map(name => (
                      <button
                        key={name}
                        onClick={() => handleSuggestionClick(name)}
                        className="px-4 py-2 text-sm rounded-full bg-blush-light/50 text-charcoal hover:bg-blush-light transition-colors flex items-center gap-1.5"
                      >
                        <TrendingUp size={12} />
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

SearchPage.getLayout = function getLayout(page: React.ReactElement) {
  return <CustomerLayout>{page}</CustomerLayout>;
};

// ─── ISR ──────────────────────────────────────────────────────────────────────
// The query itself is client-side (?q= is not part of the static path), but the
// product pool it filters is not — baking it in removes the Supabase round trip
// that used to stand between landing here and seeing any result. See index.tsx.

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
    console.error('[Search getStaticProps]', err);
    return { props: {}, revalidate: REVALIDATE_SECONDS };
  }
};

export default SearchPage;
