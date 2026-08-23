import React from 'react';
import { useNavigate } from '@/lib/routerCompat';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui';
import { useContentStore } from '@/store/contentStore';
import { DEFAULT_HERO_LAYOUT, type HeroPosition } from '@/lib/heroLayout';

export const Hero: React.FC = () => {
    const navigate = useNavigate();
    const { content } = useContentStore();

    if (!content.heroEnabled) return null;

    const hasImage = !!content.heroImageUrl;

    // Components are only rendered when they have real text — clearing a
    // field in the admin panel removes it from the live site entirely.
    const hasTitle = !!content.heroTitle?.trim();
    const hasSubtitle = !!content.heroSubtitle?.trim();
    const hasButtons = !!content.heroButtonText?.trim();
    const extraComponents = (content.heroExtraComponents ?? []).filter(
        (c) => !!c.content?.trim()
    );
    const hasAnyComponent = hasTitle || hasSubtitle || hasButtons || extraComponents.length > 0;

    const layout = content.heroLayout ?? DEFAULT_HERO_LAYOUT;

    const buildSrcSet = (url: string): string | undefined => {
        if (!url?.includes('cloudinary.com')) return undefined;
        const marker = '/upload/';
        const idx = url.indexOf(marker);
        if (idx === -1) return undefined;
        const base = url.slice(0, idx + marker.length);
        const rest = url.slice(idx + marker.length);
        const widths = [640, 1024, 1280, 1920];
        return widths.map((w) => `${base}w_${w},q_auto,f_auto/${rest} ${w}w`).join(', ');
    };

    const heroSrcSet = hasImage ? buildSrcSet(content.heroImageUrl) : undefined;
    const heroSizes = '100vw';

    const optimizeUrl = (url: string, width: number): string => {
        if (!url.includes('cloudinary.com')) return url;
        const marker = '/upload/';
        const idx = url.indexOf(marker);
        if (idx === -1) return url;
        const base = url.slice(0, idx + marker.length);
        const rest = url.slice(idx + marker.length);
        return `${base}w_${width},q_auto,f_auto/${rest}`;
    };

    const heroSrc = hasImage ? optimizeUrl(content.heroImageUrl, 1280) : undefined;

    // Mobile crop is optional — falls back to the desktop image (with
    // object-position adjusted below) when the admin hasn't uploaded one.
    const hasMobileImage = !!content.heroImageUrlMobile;
    const heroMobileSrc = hasMobileImage
        ? optimizeUrl(content.heroImageUrlMobile!, 768)
        : undefined;
    const heroMobileSrcSet = hasMobileImage
        ? buildSrcSet(content.heroImageUrlMobile!)
        : undefined;

    const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Converts a saved {x,y} percentage into absolute CSS positioning.
    // translateY(-50%) keeps the drag handle's vertical center anchored
    // to the dropped point, matching the admin builder's drag behavior.
    const positionStyle = (pos: HeroPosition): React.CSSProperties => ({
        position: 'absolute',
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: 'translateY(-50%)',
    });

    return (
        <section
            aria-label="Hero banner"
            className="relative min-h-[40vh] md:min-h-[50vh] flex items-center overflow-hidden"
        >
            {/* Background: image or gradient */}
            {hasImage ? (
                <picture>
                    {/* Dedicated mobile crop, when the admin has uploaded one */}
                    {hasMobileImage && (
                        <source
                            media="(max-width: 767px)"
                            srcSet={heroMobileSrcSet || heroMobileSrc}
                            sizes={heroSizes}
                        />
                    )}
                    <img
                        src={heroSrc}
                        srcSet={heroSrcSet}
                        sizes={heroSizes}
                        alt=""
                        aria-hidden="true"
                        loading="eager"
                        fetchPriority="high"
                        decoding="sync"
                        width={1920}
                        height={1080}
                        /*
                          Without a dedicated mobile image, a wide desktop banner
                          (16/7) gets center-cropped hard on narrow screens.
                          object-position shifts the visible window up slightly
                          so key subjects near the top of the banner aren't lost —
                          purely a fallback; uploading a mobile crop above is the
                          real fix for badly-cropped subjects.
                        */
                        className={`absolute inset-0 w-full h-full object-cover ${hasMobileImage ? 'object-center' : 'object-center md:object-center'
                            }`}
                        style={!hasMobileImage ? { objectPosition: '50% 30%' } : undefined}
                    />
                </picture>
            ) : (
                <div className="absolute inset-0 hero-gradient" aria-hidden="true" />
            )}

            {!hasImage && (
                <div className="absolute inset-0" aria-hidden="true">
                    <motion.div
                        animate={prefersReducedMotion ? {} : { y: [0, -20, 0], rotate: [0, 5, 0] }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute top-10 right-[10%] w-40 h-40 rounded-full bg-white/10 backdrop-blur-sm"
                    />
                    <motion.div
                        animate={prefersReducedMotion ? {} : { y: [0, 15, 0], rotate: [0, -3, 0] }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                        className="absolute bottom-10 left-[5%] w-32 h-32 rounded-full bg-white/10 backdrop-blur-sm"
                    />
                </div>
            )}

            {!hasAnyComponent ? null : (
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/30 backdrop-blur-sm text-sm font-medium text-charcoal mb-4">
                        <Sparkles size={14} className="text-rose-gold" aria-hidden="true" />
                    </span>

                    {/* Free-positioning canvas — children are placed by % coordinates
                        set in the admin panel's drag-and-drop builder. */}
                    <div className="relative w-full h-56 sm:h-64 md:h-72 lg:h-80">
                        {hasTitle && (
                            <motion.h1
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.15 }}
                                style={positionStyle(layout.title)}
                                className={`heading-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] max-w-xl ${hasImage ? 'text-white drop-shadow-lg' : 'text-charcoal'
                                    }`}
                            >
                                {content.heroTitle}
                            </motion.h1>
                        )}

                        {hasSubtitle && (
                            <motion.p
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.3 }}
                                style={positionStyle(layout.subtitle)}
                                className={`text-sm md:text-base max-w-lg leading-relaxed ${hasImage ? 'text-white/90 drop-shadow' : 'text-[#6B5B55]'
                                    }`}
                            >
                                {content.heroSubtitle}
                            </motion.p>
                        )}

                        {hasButtons && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.45 }}
                                style={positionStyle(layout.buttons)}
                                className="flex flex-wrap gap-3"
                            >
                                <Button
                                    size="md"
                                    onClick={() => navigate('/shop')}
                                    aria-label={content.heroButtonText || 'Shop now'}
                                >
                                    {content.heroButtonText}
                                    <ArrowRight size={16} aria-hidden="true" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="md"
                                    onClick={() => navigate('/sale')}
                                    aria-label="Shop sale items"
                                >
                                    Shop Sale
                                </Button>
                            </motion.div>
                        )}

                        {extraComponents.map((comp) => (
                            <motion.div
                                key={comp.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={positionStyle(comp.position)}
                                className="max-w-sm"
                            >
                                {comp.type === 'button' ? (
                                    <Button
                                        size="md"
                                        onClick={() => comp.link && navigate(comp.link)}
                                    >
                                        {comp.content}
                                    </Button>
                                ) : (
                                    <p
                                        className={`text-sm md:text-base leading-relaxed ${hasImage ? 'text-white drop-shadow' : 'text-charcoal'
                                            }`}
                                    >
                                        {comp.content}
                                    </p>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
};