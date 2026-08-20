// component/Home/NewArrival.tsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { FadeIn, SectionHeader, PriceDisplay, Badge, Button } from '@/components/ui';
import { useProductStore } from '@/store';
import { useContentStore } from '@/store/contentStore';
import { useAutoScroll } from './useAutoScroll';
import { getOptimizedImageUrl } from '@/lib/cloudinary';
import { BRAND } from '@/config/brandingConfig';

export const NewArrivals: React.FC = () => {
    const { products, fetchProducts } = useProductStore();
    const { content } = useContentStore();
    const navigate = useNavigate();

    const CARD_WIDTH = 280 + 20;
    const newItems = products.filter((p) => p.isNewArrival);
    const allSlides = [...newItems, ...newItems, ...newItems];

    const { trackRef, isPausedRef, handlePrev, handleNext } = useAutoScroll(
        newItems.length,
        CARD_WIDTH,
        1.2,
        true
    );

    useEffect(() => { fetchProducts(); }, []);

    /* ── Pull config from content store ── */
    const section = content.newArrivalsSection;
    const title = section?.title || '';
    const subtitle = section?.subtitle || '';
    const buttonUrl = section?.buttonUrl || '';
    const emptyMsg = section?.emptyMessage || '';
    const bgColor = section?.backgroundColor || BRAND.colors.softBg;

    /* ── If admin set a buttonUrl the entire header becomes a link ── */
    const handleHeaderClick = () => {
        if (!buttonUrl) return;
        if (buttonUrl.startsWith('http')) {
            window.open(buttonUrl, '_blank', 'noopener noreferrer');
        } else {
            navigate(buttonUrl);
        }
    };

    return (
        <section className="py-4 md:py-6 overflow-hidden" style={{ backgroundColor: bgColor }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <FadeIn>
                    {/* Whole header block is clickable when admin sets a URL */}
                    <div
                        onClick={handleHeaderClick}
                        className={buttonUrl ? 'cursor-pointer flex flex-col items-center' : 'flex flex-col items-center'}
                        role={buttonUrl ? 'link' : undefined}
                        aria-label={buttonUrl ? `${title} — view all` : undefined}
                        tabIndex={buttonUrl ? 0 : undefined}
                        onKeyDown={buttonUrl
                            ? (e) => { if (e.key === 'Enter') handleHeaderClick(); }
                            : undefined
                        }
                    >
                        <SectionHeader title={title} subtitle={subtitle} />
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-[-1.5rem] mb-6"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/new-arrivals');
                            }}
                        >
                            See More
                        </Button>
                    </div>
                </FadeIn>
            </div>

            {newItems.length === 0 ? (
                emptyMsg ? (
                    <div className="text-center py-8 text-warm-gray">
                        <p>{emptyMsg}</p>
                    </div>
                ) : null
            ) : (
                <div className="relative mt-4">
                    <div
                        className="overflow-hidden"
                        onMouseEnter={() => { isPausedRef.current = true; }}
                        onMouseLeave={() => { isPausedRef.current = false; }}
                        onTouchStart={() => { isPausedRef.current = true; }}
                        onTouchEnd={() => { isPausedRef.current = false; }}
                    >
                        <div ref={trackRef} className="flex gap-5 will-change-transform" style={{ width: 'max-content' }}>
                            {allSlides.map((product, idx) => (
                                <div
                                    key={`${product.id}-${idx}`}
                                    className="flex-shrink-0 w-[280px] cursor-pointer group"
                                    onClick={() => navigate(`/product/${product.slug}`)}
                                >
                                    {/* Photo Card */}
                                    <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-blush-light/30">
                                        {product.images?.[0]?.startsWith('http') ? (
                                            <img
                                                src={getOptimizedImageUrl(product.images[0], { width: 360, height: 480, crop: 'fill' })}
                                                alt={product.name}
                                                loading={idx < 6 ? 'eager' : 'lazy'}
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 bg-gradient-to-br from-blush via-lavender to-champagne" />
                                        )}
                                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                                            {product.isOnSale && <Badge variant="sale">Sale</Badge>}
                                            {product.isNewArrival && <Badge variant="new">New</Badge>}
                                            {product.isTrending && <Badge variant="trending">Trending</Badge>}
                                        </div>
                                    </div>

                                    {/* Text below photo */}
                                    <div className="pt-3 px-1">
                                        <p className="text-xs text-warm-gray mb-0.5">{product.category}</p>
                                        <h3 className="text-sm font-medium text-charcoal mb-1 line-clamp-1 group-hover:text-rose-gold transition-colors">
                                            {product.name}
                                        </h3>
                                        <PriceDisplay price={product.price} comparePrice={product.comparePrice} size="sm" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={handlePrev} aria-label="Previous" className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-200">
                        <ArrowLeft size={18} className="text-charcoal" />
                    </button>
                    <button onClick={handleNext} aria-label="Next" className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-200">
                        <ArrowRight size={18} className="text-charcoal" />
                    </button>
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white/60 to-transparent z-[5]" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white/60 to-transparent z-[5]" />
                </div>
            )}
        </section>
    );
};