import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Star } from 'lucide-react';
import { PriceDisplay, Badge, StarRating } from '@/components/ui';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '@/lib/cloudinary';
import type { Product } from '@/types';

interface ProductCardProps {
    product: Product;
    /**
     * Pass `priority={true}` for the first N cards in a grid so they load
     * eagerly with high fetchPriority (above-the-fold LCP candidates).
     */
    priority?: boolean;
}

// Colour name → hex lookup
const COLOR_MAP: Record<string, string> = {
    red: '#E53E3E', magenta: '#FF00FF', black: '#1A1A1A',
    hotpink: '#FF69B4', white: '#FFFFFF', skin: '#F5CBA7',
    beige: '#F5F0E8', pink: '#FFB6C1', navy: '#1A237E',
    blue: '#3182CE', green: '#38A169', yellow: '#ECC94B',
    orange: '#ED8936', purple: '#805AD5', grey: '#A0AEC0',
    gray: '#A0AEC0', brown: '#8B4513', maroon: '#800000',
    cream: '#FFFDD0', gold: '#FFD700', silver: '#C0C0C0',
    coral: '#FF6B6B', peach: '#FFCBA4', rose: '#FF007F',
    lavender: '#E6E6FA', teal: '#008080', mint: '#98FF98',
    nude: '#E8C9A0', wine: '#722F37', burgundy: '#800020',
};

const CARD_SRCSET_WIDTHS = [240, 360, 480, 640];
const CARD_SIZES = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw';

export const ProductCard: React.FC<ProductCardProps> = React.memo(
    ({ product, priority = false }) => {
        const rawSrc = product.images?.[0]?.startsWith('http') ? product.images[0] : null;

        const optimisedSrc = rawSrc
            ? getOptimizedImageUrl(rawSrc, { width: 480, crop: 'fill' })
            : null;

        const srcSet = rawSrc
            ? getResponsiveSrcSet(rawSrc, { widths: CARD_SRCSET_WIDTHS, crop: 'fill' })
            : '';

        const imageAlt = `${product.name}${product.category ? ` — ${product.category}` : ''}`;

        const discountPct =
            product.comparePrice && product.comparePrice > product.price
                ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
                : 0;

        const productUrl = `/product/${product.slug}`;

        return (
            <Link
                to={productUrl}
                aria-label={`${product.name}${discountPct > 0 ? `, ${discountPct}% off` : ''}, $${product.price}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:ring-offset-2 rounded-[20px] group"
                onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button')) e.preventDefault();
                }}
            >
                <motion.article
                    whileHover={{
                        y: -4,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.14)',
                        transition: { duration: 0.3 },
                    }}
                    style={{
                        borderRadius: '20px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                        backdropFilter: 'blur(10px)',
                        transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                        padding: '8px',
                        backgroundColor: 'rgba(255, 228, 237, 0.35)',
                    }}
                >
                    {/* Image container */}
                    <div className="relative rounded-2xl overflow-hidden aspect-[3/4] mb-3 bg-blush-light/30">
                        {optimisedSrc ? (
                            <img
                                src={optimisedSrc}
                                srcSet={srcSet || undefined}
                                sizes={srcSet ? CARD_SIZES : undefined}
                                alt={imageAlt}
                                width={480}
                                height={640}
                                loading={priority ? 'eager' : 'lazy'}
                                decoding={priority ? 'sync' : 'async'}
                                fetchPriority={priority ? 'high' : 'low'}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                        ) : (
                            <div
                                className="absolute inset-0 bg-gradient-to-br from-blush via-lavender to-champagne group-hover:scale-105 transition-transform duration-700"
                                aria-hidden="true"
                            />
                        )}

                        {/* Badges */}
                        {(product.isOnSale || product.isNewArrival || product.isTrending || discountPct > 0) && (
                            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10" aria-hidden="true">
                                {discountPct > 0 && <Badge variant="sale">{discountPct}% OFF</Badge>}
                                {product.isOnSale && !discountPct && <Badge variant="sale">Sale</Badge>}
                                {product.isNewArrival && <Badge variant="new">New</Badge>}
                                {product.isTrending && <Badge variant="trending">Trending</Badge>}
                            </div>
                        )}

                        {/* Quick View overlay */}
                        <div
                            className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
                            aria-hidden="true"
                        >
                            <button
                                type="button"
                                tabIndex={-1}
                                className="flex-1 py-2.5 glass rounded-xl text-xs font-medium text-charcoal hover:bg-white/90 transition-colors flex items-center justify-center gap-1.5"
                            >
                                <ShoppingBag size={14} aria-hidden="true" />
                                Quick View
                            </button>
                        </div>

                        {/* Wishlist button */}
                        <button
                            type="button"
                            tabIndex={-1}
                            aria-hidden="true"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                        >
                            <Star size={14} className="text-rose-gold" aria-hidden="true" />
                        </button>
                    </div>

                    {/* Text info */}
                    <div>
                        {product.categorySlug ? (
                            <Link
                                to={`/category/${product.categorySlug}`}
                                onClick={(e) => e.stopPropagation()}
                                tabIndex={-1}
                                aria-hidden="true"
                                className="text-xs text-[#6B5B55] hover:text-rose-gold transition-colors mb-0.5 block"
                            >
                                {product.category}
                            </Link>
                        ) : (
                            <p className="text-xs text-[#6B5B55] mb-0.5">{product.category}</p>
                        )}

                        <h3 className="text-sm font-medium text-charcoal mb-1 line-clamp-2 leading-snug group-hover:text-rose-gold transition-colors">
                            {product.name}
                        </h3>

                        {product.reviewCount > 0 && (
                            <div
                                className="flex items-center gap-1 mb-1"
                                aria-label={`Rated ${product.rating.toFixed(1)} out of 5, ${product.reviewCount} reviews`}
                            >
                                <StarRating rating={product.rating} size={12} />
                                <span className="text-xs text-[#6B5B55]">({product.reviewCount})</span>
                            </div>
                        )}

                        <PriceDisplay price={product.price} comparePrice={product.comparePrice} size="sm" />

                        {product.stock === 0 && (
                            <p className="text-xs text-red-500 font-medium mt-1" aria-label="Out of stock">
                                Out of Stock
                            </p>
                        )}
                    </div>

                    {/* Colour swatches */}
                    {product.colors && product.colors.length > 0 && (
                        <div
                            className="flex items-center gap-1.5 mt-2 flex-wrap"
                            aria-label={`Available colours: ${product.colors
                                .map((c: any) => (typeof c === 'string' ? c : c.name || c.label || ''))
                                .filter(Boolean)
                                .join(', ')}`}
                        >
                            {product.colors.slice(0, 6).map((color: any, index: number) => {
                                const colorName =
                                    typeof color === 'string' ? color : color.name || color.label || '';
                                const rawHex =
                                    typeof color === 'string'
                                        ? color
                                        : color.hex || color.value || color.color || '';
                                const hex =
                                    rawHex.startsWith('#') || rawHex.startsWith('linear-gradient')
                                        ? rawHex
                                        : COLOR_MAP[colorName.toLowerCase()] || '#cccccc';

                                return (
                                    <span
                                        key={`${colorName}-${index}`}
                                        role="img"
                                        aria-label={colorName}
                                        className="w-3.5 h-3.5 rounded-full border border-charcoal/10 flex-shrink-0"
                                        style={
                                            hex.startsWith('linear-gradient')
                                                ? { background: hex }
                                                : { backgroundColor: hex }
                                        }
                                    />
                                );
                            })}
                            {product.colors.length > 6 && (
                                <span
                                    className="text-xs text-[#6B5B55]"
                                    aria-label={`and ${product.colors.length - 6} more colours`}
                                >
                                    +{product.colors.length - 6}
                                </span>
                            )}
                        </div>
                    )}
                </motion.article>
            </Link>
        );
    }
);
ProductCard.displayName = 'ProductCard';
