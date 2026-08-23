import React, { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/routerCompat';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useContentStore } from '@/store/contentStore';

// Falls back to inferring the type from which URL is populated, so older
// saved banners (created before mediaType existed) still render correctly.
const getBannerMediaType = (banner: { mediaType?: string; videoUrl?: string; imageUrl?: string }) =>
    banner.mediaType ?? (banner.videoUrl ? 'video' : banner.imageUrl ? 'image' : 'gradient');

export const BannerSlider: React.FC = () => {
    const [current, setCurrent] = useState(0);
    const { content } = useContentStore();
    const banners = content.banners.filter((b) => b.active);
    const navigate = useNavigate();

    useEffect(() => {
        if (banners.length === 0) return;
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [banners.length]);

    useEffect(() => {
        if (current >= banners.length) setCurrent(0);
    }, [banners.length, current]);

    if (banners.length === 0) return null;

    const banner = banners[current];
    const mediaType = getBannerMediaType(banner);
    const hasDarkBackdrop = mediaType === 'video' || mediaType === 'image';

    return (
        <section className="relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="relative rounded-3xl overflow-hidden h-64 md:h-80 lg:h-96">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={current}
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -100 }}
                            transition={{ duration: 0.6, ease: 'easeInOut' }}
                            onClick={() => navigate(banner.buttonLink)}
                            className="absolute inset-0 flex items-center cursor-pointer"
                        >
                            {/* Background layer: video > image > gradient */}
                            {mediaType === 'video' && banner.videoUrl ? (
                                <video
                                    key={banner.videoUrl}
                                    src={banner.videoUrl}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    disablePictureInPicture
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                            ) : mediaType === 'image' && banner.imageUrl ? (
                                <>
                                    {/* Mobile crop — only rendered below md breakpoint, when provided */}
                                    {banner.imageUrlMobile && (
                                        <div
                                            className="absolute inset-0 block md:hidden"
                                            style={{
                                                backgroundImage: `url(${banner.imageUrlMobile})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                            }}
                                        />
                                    )}
                                    {/* Desktop image — always the fallback; hidden on mobile only
                                        when a dedicated mobile crop exists */}
                                    <div
                                        className={`absolute inset-0 ${banner.imageUrlMobile ? 'hidden md:block' : 'block'}`}
                                        style={{
                                            backgroundImage: `url(${banner.imageUrl})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: banner.imageUrlMobile ? 'center' : 'center 30%',
                                        }}
                                    />
                                </>
                            ) : (
                                <div className="absolute inset-0" style={{ background: banner.gradient }} />
                            )}

                            <div className="relative px-8 md:px-16 max-w-xl">
                                <h3
                                    className={`heading-serif text-2xl md:text-4xl lg:text-5xl font-bold mb-3 ${hasDarkBackdrop ? 'text-white drop-shadow-lg' : 'text-charcoal'
                                        }`}
                                >
                                    {banner.title}
                                </h3>
                                <p
                                    className={`text-sm md:text-base mb-6 ${hasDarkBackdrop ? 'text-white/90 drop-shadow' : 'text-[#6B5B55]'
                                        }`}
                                >
                                    {banner.subtitle}
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Dots */}
                    {banners.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                            {banners.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrent(i)}
                                    className={`h-2.5 rounded-full transition-all duration-300 ${i === current ? 'bg-rose-gold w-8' : 'bg-white/60 w-2.5'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Navigation Arrows */}
                {banners.length > 1 && (
                    <>
                        <button
                            onClick={() => setCurrent((prev) => (prev - 1 + banners.length) % banners.length)}
                            className="absolute left-8 md:left-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/80 transition-colors z-10"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <button
                            onClick={() => setCurrent((prev) => (prev + 1) % banners.length)}
                            className="absolute right-8 md:right-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/80 transition-colors z-10"
                        >
                            <ArrowRight size={18} />
                        </button>
                    </>
                )}
            </div>
        </section>
    );
};