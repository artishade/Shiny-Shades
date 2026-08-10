import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { FadeIn, SectionHeader, PriceDisplay, Badge, Button } from '@/components/ui';
import { useProductStore } from '@/store';
import { useContentStore } from '@/store/contentStore';
import { getOptimizedImageUrl } from '@/lib/cloudinary';
import { BRAND } from '@/config/brandingConfig';

export const FeaturedCollection: React.FC = () => {
    const { products, fetchProducts } = useProductStore();
    const { content } = useContentStore();
    const navigate = useNavigate();

    useEffect(() => { fetchProducts(); }, []);

    const featured = products.filter((p) => p.isFeatured);

    return (
        <section className="py-12 md:py-16" style={{ backgroundColor: BRAND.colors.softBg }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <FadeIn>
                    <SectionHeader
                        title={content.featuredTitle}
                        subtitle={content.featuredSubtitle}
                    />
                </FadeIn>

                {featured.length === 0 ? (
                    <div className="text-center py-16 text-warm-gray">
                        <p>No featured products yet. Mark products as "Featured" in the admin panel.</p>
                    </div>
                ) : (
                    <FadeIn delay={0.15}>
                        <div
                            className="mt-10"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gridTemplateRows: 'repeat(3, auto)',
                                gridAutoRows: '0px',
                                overflow: 'hidden',
                                gap: '20px',
                            }}
                        >
                            {featured.map((product, idx) => (
                                <div
                                    key={product.id}
                                    className="cursor-pointer group"
                                    onClick={() => navigate(`/product/${product.slug}`)}
                                >
                                    {/* Photo Card */}
                                    <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-blush-light/30">
                                        {product.images?.[0]?.startsWith('http') ? (
                                            <img
                                                src={getOptimizedImageUrl(product.images[0], {
                                                    width: 360,
                                                    height: 480,
                                                    crop: 'fill',
                                                })}
                                                alt={product.name}
                                                loading={idx < 6 ? 'eager' : 'lazy'}
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div
                                                className="absolute inset-0"
                                                style={{ backgroundColor: BRAND.colors.blush }}
                                            />
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
                                        <PriceDisplay
                                            price={product.price}
                                            comparePrice={product.comparePrice}
                                            size="sm"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </FadeIn>
                )}

                {/* See All Featured Collection Button */}
                <FadeIn delay={0.3}>
                    <div className="text-center mt-10">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/shop?featured=true')}
                            style={{ borderColor: BRAND.colors.primary, color: BRAND.colors.primary }}
                        >
                            See All Featured Collection <ArrowRight size={16} />
                        </Button>
                    </div>
                </FadeIn>
            </div>
        </section>
    );
};