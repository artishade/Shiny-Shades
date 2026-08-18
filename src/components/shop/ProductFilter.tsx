/* ===================================================
   Shiny Shades - Dynamic Product Filter Component
   Auto-detects and only displays available categories,
   sizes, colours, styles, and dynamic price ranges.
   =================================================== */

import React, { useMemo } from 'react';
import { Check, RotateCcw, ArrowUpDown } from 'lucide-react';
import { SITE } from '@/config/siteConfig';
import type { Product } from '@/types';
import { resolveColorHex } from '@/lib/colorUtils';

export interface ExtractedFilterOptions {
  categories: { name: string; count: number }[];
  sizes: { size: string; count: number }[];
  colors: { name: string; hex: string; count: number }[];
  styles: { style: string; count: number }[];
  minPrice: number;
  maxPrice: number;
}

export interface ProductFilterProps {
  products: any[];
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  selectedSizes: string[];
  onToggleSize: (size: string) => void;
  selectedColors: string[];
  onToggleColor: (colorName: string) => void;
  selectedStyles?: string[];
  onToggleStyle?: (style: string) => void;
  priceRange: [number, number];
  onPriceChange: (range: [number, number]) => void;
  sort?: string;
  onSortChange?: (sort: string) => void;
  onClearAll: () => void;
  activeFilterCount: number;
}

/**
 * Extracts only currently available filter options from the provided product list
 */
export function extractAvailableFilters(products: any[]): ExtractedFilterOptions {
  const categoryMap = new Map<string, number>();
  const sizeMap = new Map<string, number>();
  const colorMap = new Map<string, { hex: string; count: number }>();
  const styleMap = new Map<string, number>();

  let minPrice = Infinity;
  let maxPrice = 0;

  products.forEach((p) => {
    // Price
    const price = Number(p.price) || 0;
    if (price > 0) {
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;
    }

    // Category
    const cat = p.category || p.category_name || (typeof p.category === 'object' ? p.category?.name : '');
    if (cat && typeof cat === 'string' && cat.trim()) {
      const trimmed = cat.trim();
      categoryMap.set(trimmed, (categoryMap.get(trimmed) || 0) + 1);
    }

    // Sizes
    if (Array.isArray(p.sizes)) {
      p.sizes.forEach((s: any) => {
        if (s && typeof s === 'string' && s.trim()) {
          const trimmed = s.trim();
          sizeMap.set(trimmed, (sizeMap.get(trimmed) || 0) + 1);
        }
      });
    }

    // Colors
    if (Array.isArray(p.colors)) {
      p.colors.forEach((c: any) => {
        let name = '';
        let rawColor = '';

        if (typeof c === 'string' && c.trim()) {
          name = c.trim();
          rawColor = c.trim();
        } else if (c && typeof c === 'object') {
          name = (c.name || c.label || c.color || '').trim();
          rawColor = c.hex || c.value || c.color || c.name || c.label || '';
        }

        if (name) {
          const hex = resolveColorHex(rawColor || name);
          const existing = colorMap.get(name);
          if (existing) {
            existing.count += 1;
          } else {
            colorMap.set(name, { hex, count: 1 });
          }
        }
      });
    }

    // Styles / Tags
    if (Array.isArray(p.tags)) {
      p.tags.forEach((t: any) => {
        if (t && typeof t === 'string' && t.trim()) {
          const trimmed = t.trim();
          styleMap.set(trimmed, (styleMap.get(trimmed) || 0) + 1);
        }
      });
    }
  });

  const finalMinPrice = minPrice === Infinity ? 0 : Math.floor(minPrice / 50) * 50;
  const finalMaxPrice = maxPrice === 0 ? 10000 : Math.ceil(maxPrice / 100) * 100;

  // Natural sort sizes: XS, S, M, L, XL, XXL, etc.
  const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', 'Free Size', 'One Size'];
  const sortedSizes = Array.from(sizeMap.entries())
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => {
      const idxA = sizeOrder.indexOf(a.size);
      const idxB = sizeOrder.indexOf(b.size);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.size.localeCompare(b.size);
    });

  return {
    categories: Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    sizes: sortedSizes,
    colors: Array.from(colorMap.entries())
      .map(([name, { hex, count }]) => ({ name, hex, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    styles: Array.from(styleMap.entries())
      .map(([style, count]) => ({ style, count }))
      .sort((a, b) => b.count - a.count),
    minPrice: finalMinPrice,
    maxPrice: finalMaxPrice,
  };
}

export const ProductFilterPanel: React.FC<ProductFilterProps> = ({
  products,
  selectedCategories,
  onToggleCategory,
  selectedSizes,
  onToggleSize,
  selectedColors,
  onToggleColor,
  selectedStyles = [],
  onToggleStyle,
  priceRange,
  onPriceChange,
  sort,
  onSortChange,
  onClearAll,
  activeFilterCount,
}) => {
  // Extract options once from initial/page product pool
  const available = useMemo(() => extractAvailableFilters(products), [products]);

  const hasCategories = available.categories.length > 0;
  const hasSizes = available.sizes.length > 0;
  const hasColors = available.colors.length > 0;
  const hasStyles = available.styles.length > 0;
  const hasPrice = available.maxPrice > 0;

  return (
    <div className="space-y-6">
      {/* Top Header / Clear all */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between pb-3 border-b border-blush/30">
          <span className="text-xs font-semibold text-charcoal uppercase tracking-wider">
            {activeFilterCount} {activeFilterCount === 1 ? 'Filter' : 'Filters'} Active
          </span>
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-rose-gold hover:text-deep-rose font-medium flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={12} />
            Reset all
          </button>
        </div>
      )}

      {/* ── 1. Category Filter (Automatically detected) ── */}
      {hasCategories && (
        <div className="pb-5 border-b border-blush/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Category
            </h3>
            {selectedCategories.length > 0 && (
              <span className="text-[11px] text-rose-gold font-medium">
                {selectedCategories.length} selected
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {available.categories.map(({ name, count }) => {
              const isSelected = selectedCategories.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onToggleCategory(name)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
                    isSelected
                      ? 'bg-rose-gold/10 text-rose-gold font-semibold border border-rose-gold/30'
                      : 'text-[#6B5B55] hover:bg-blush-light/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-rose-gold border-rose-gold text-white'
                          : 'border-blush/60 bg-white'
                      }`}
                    >
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className="truncate">{name}</span>
                  </div>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blush-light text-[#8C7269]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 2. Size Filter (Automatically detected) ── */}
      {hasSizes && (
        <div className="pb-5 border-b border-blush/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Size
            </h3>
            {selectedSizes.length > 0 && (
              <span className="text-[11px] text-rose-gold font-medium">
                {selectedSizes.length} selected
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {available.sizes.map(({ size, count }) => {
              const isSelected = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => onToggleSize(size)}
                  title={`${size} (${count} items)`}
                  className={`min-w-[42px] px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-rose-gold text-white border-rose-gold shadow-sm shadow-rose-gold/20'
                      : 'border-blush/40 text-[#6B5B55] bg-white hover:border-rose-gold'
                  }`}
                >
                  <span>{size}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. Colour Filter (Automatically detected) ── */}
      {hasColors && (
        <div className="pb-5 border-b border-blush/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Colour
            </h3>
            {selectedColors.length > 0 && (
              <span className="text-[11px] text-rose-gold font-medium">
                {selectedColors.length} selected
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            {available.colors.map(({ name, hex, count }) => {
              const isSelected = selectedColors.includes(name);
              const isLight = hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#faf9f6' || hex.toLowerCase() === '#fffdd0';
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onToggleColor(name)}
                  title={`${name} (${count})`}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-left border transition-all ${
                    isSelected
                      ? 'border-rose-gold bg-rose-gold/10 font-semibold text-rose-gold'
                      : 'border-blush/30 text-[#6B5B55] bg-white hover:border-rose-gold/60'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center shadow-xs ${
                      isLight ? 'border border-gray-300' : ''
                    }`}
                    style={
                      hex.startsWith('linear-gradient') || hex.startsWith('radial-gradient')
                        ? { background: hex }
                        : { backgroundColor: hex }
                    }
                  >
                    {isSelected && (
                      <Check
                        size={10}
                        className={isLight ? 'text-charcoal' : 'text-white'}
                        strokeWidth={3}
                      />
                    )}
                  </span>
                  <span className="truncate capitalize">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4. Style / Tag Filter (Shown only if available) ── */}
      {hasStyles && onToggleStyle && (
        <div className="pb-5 border-b border-blush/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Style & Tag
            </h3>
            {selectedStyles.length > 0 && (
              <span className="text-[11px] text-rose-gold font-medium">
                {selectedStyles.length} selected
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
            {available.styles.map(({ style, count }) => {
              const isSelected = selectedStyles.includes(style);
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => onToggleStyle(style)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-all border ${
                    isSelected
                      ? 'bg-rose-gold text-white border-rose-gold font-medium'
                      : 'bg-white text-[#6B5B55] border-blush/40 hover:border-rose-gold'
                  }`}
                >
                  #{style} <span className="opacity-70 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5. Price Filter & Quick Low-to-High Sort ── */}
      {hasPrice && (
        <div className="pb-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Price Range
            </h3>
            {priceRange[1] < available.maxPrice && (
              <span className="text-[11px] text-rose-gold font-medium">
                Up to {SITE.currency.symbol}{priceRange[1].toLocaleString()}
              </span>
            )}
          </div>

          <div className="px-1 mb-3">
            <input
              type="range"
              min={available.minPrice}
              max={available.maxPrice}
              step={50}
              value={priceRange[1]}
              onChange={(e) => onPriceChange([priceRange[0], parseInt(e.target.value, 10)])}
              className="w-full accent-rose-gold cursor-pointer"
            />
            <div className="flex justify-between text-xs text-[#6B5B55] font-medium mt-1.5">
              <span>{SITE.currency.symbol}{available.minPrice.toLocaleString()}</span>
              <span>
                {priceRange[1] >= available.maxPrice
                  ? `${SITE.currency.symbol}${available.maxPrice.toLocaleString()}+`
                  : `${SITE.currency.symbol}${priceRange[1].toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Quick Price Sorting Pills */}
          {onSortChange && (
            <div className="mt-3 pt-3 border-t border-blush/20">
              <span className="text-[11px] font-semibold text-[#8C7269] uppercase tracking-wider block mb-2">
                Quick Price Sort
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSortChange(sort === 'price_asc' ? 'newest' : 'price_asc')}
                  className={`px-2.5 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                    sort === 'price_asc'
                      ? 'bg-rose-gold text-white border-rose-gold shadow-sm'
                      : 'bg-white text-[#6B5B55] border-blush/40 hover:border-rose-gold'
                  }`}
                >
                  <ArrowUpDown size={12} />
                  Low to High
                </button>
                <button
                  type="button"
                  onClick={() => onSortChange(sort === 'price_desc' ? 'newest' : 'price_desc')}
                  className={`px-2.5 py-2 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                    sort === 'price_desc'
                      ? 'bg-rose-gold text-white border-rose-gold shadow-sm'
                      : 'bg-white text-[#6B5B55] border-blush/40 hover:border-rose-gold'
                  }`}
                >
                  <ArrowUpDown size={12} className="rotate-180" />
                  High to Low
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
