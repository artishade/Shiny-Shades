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
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search as SearchIcon, ArrowRight, Clock, X, TrendingUp } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { ProductCard } from '@/components/home';
import { Button, EmptyState } from '@/components/ui';
import { useProductStore } from '@/store';
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

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(query);
  const { products, fetchProducts } = useProductStore();

  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

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
      <Helmet>
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
      </Helmet>

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
                    Press Enter to search for "{inputValue.trim()}"
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
                {results.length} {results.length === 1 ? 'result' : 'results'} for "{query}"
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
                  {results.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
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