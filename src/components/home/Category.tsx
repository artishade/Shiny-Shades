import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { FadeIn, SectionHeader } from '@/components/ui';
import { useCategoryStore } from '@/store';
import { useAutoScroll } from './useAutoScroll';
import { BRAND } from '@/config/brandingConfig';

export const Category: React.FC = () => {
    const navigate = useNavigate();
    const { categories } = useCategoryStore();

    const CARD_WIDTH = 260 + 10;
    const allSlides = [...categories, ...categories, ...categories];

    const { trackRef, isPausedRef, handlePrev, handleNext } = useAutoScroll(
        categories.length,
        CARD_WIDTH,
        1.2,
        true
    );

    return (
        <section className="py-8 md:py-12 overflow-hidden" style={{ backgroundColor: BRAND.colors.blushLight }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <FadeIn>
                    <SectionHeader
                        title="Shop by Category"
                        subtitle="Find your perfect piece in our curated collections"
                    />
                </FadeIn>
            </div>

            {categories.length === 0 ? (
                <div className="text-center py-16 text-warm-gray">
                    <p>No categories yet.</p>
                </div>
            ) : (
                <div className="relative mt-10">
                    <div
                        className="overflow-hidden"
                        onMouseEnter={() => { isPausedRef.current = true; }}
                        onMouseLeave={() => { isPausedRef.current = false; }}
                        onTouchStart={() => { isPausedRef.current = true; }}
                        onTouchEnd={() => { isPausedRef.current = false; }}
                    >
                        <div ref={trackRef} className="flex gap-4 will-change-transform" style={{ width: 'max-content' }}>
                            {allSlides.map((category, idx) => (
                                <motion.div
                                    key={`${category.slug}-${idx}`}
                                    whileHover={{ y: -8, scale: 1.02 }}
                                    transition={{ type: 'spring', stiffness: 300 }}
                                    onClick={() => navigate(`/shop?category=${encodeURIComponent(category.name)}`)}
                                    className="relative flex-shrink-0 w-[260px] cursor-pointer rounded-2xl overflow-hidden aspect-[3/4] group"
                                    style={{ background: category.gradient }}
                                >
                                    {category.image && (
                                        <img
                                            src={category.image}
                                            alt={category.name}
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                    )}

                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300" />

                                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-10">
                                        <h3 className="heading-serif text-lg md:text-xl font-semibold text-white mb-1">
                                            {category.name}
                                        </h3>
                                        <p className="text-xs md:text-sm text-white/80">
                                            {category.productCount || 0} products
                                        </p>
                                    </div>

                                    <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <ArrowRight size={14} className="text-white" />
                                    </div>
                                </motion.div>
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
