// dataLayer global type declaration
declare global {
  interface Window {
    dataLayer: any[];
  }
}

import { CustomerLayout } from '@/components/layout/CustomerLayout';
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  memo,
} from 'react';
import { useParams, useNavigate, useSearchParams, Link } from '@/lib/routerCompat';
import Head from 'next/head';
import {
  ShoppingBag,
  Heart,
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ChevronRight,
  Star,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Button, Badge, PriceDisplay, FadeIn } from '@/components/ui';
import { ProductCard } from '@/components/home';
import { supabase } from '@/lib/supabase';
import { useCartStore, useRecentlyViewedStore } from '@/store';
import type { Product } from '@/types';
import { trackViewContent } from '@/lib/facebookPixel';
import { SITE } from '@/config/siteConfig';
import { BRAND, UI } from '@/config/brandingConfig';
import type { GetStaticPaths, GetStaticProps } from 'next';

// ─── Fast In-Memory Color Resolver (Zero Heavy Dependencies) ──────────────────
const FAST_COLORS: Record<string, string> = {
  white: '#FFFFFF', 'off white': '#FAF9F6', cream: '#FFFDD0', ivory: '#FFFFF0',
  black: '#000000', charcoal: '#36454F', 'dark grey': '#A9A9A9', grey: '#808080',
  'light grey': '#D3D3D3', gray: '#808080', 'dark gray': '#A9A9A9', 'light gray': '#D3D3D3',
  red: '#FF0000', 'dark red': '#8B0000', maroon: '#800000', crimson: '#DC143C',
  pink: '#FFC0CB', 'hot pink': '#FF69B4', 'baby pink': '#F4C2C2', rose: '#FF007F',
  blush: '#FFB6C1', magenta: '#FF00FF', purple: '#800080', violet: '#EE82EE',
  lavender: '#E6E6FA', navy: '#000080', blue: '#0000FF', 'sky blue': '#87CEEB',
  'baby blue': '#89CFF0', 'royal blue': '#4169E1', teal: '#008080', cyan: '#00FFFF',
  turquoise: '#40E0D0', green: '#008000', 'dark green': '#006400', 'light green': '#90EE90',
  mint: '#98FF98', olive: '#808000', yellow: '#FFFF00', 'light yellow': '#FFFFE0',
  gold: '#FFD700', orange: '#FFA500', peach: '#FFDAB9', coral: '#FF6B6B',
  salmon: '#FA8072', brown: '#8B4513', 'dark brown': '#5C4033', 'light brown': '#C4A882',
  tan: '#D2B48C', beige: '#F5F5DC', skin: '#FED9B0', nude: '#E8C9A0', camel: '#C19A6B',
  'rose gold': '#B76E79', copper: '#B87333', silver: '#C0C0C0', wine: '#722F37',
  burgundy: '#800020', mustard: '#FFDB58', khaki: '#F0E68C', lemon: '#FFF44F',
  indigo: '#4B0082', mauve: '#E0B0FF',
  multicolor: 'linear-gradient(135deg,#FF6B6B,#FFD700,#6BCB77,#4D96FF,#C77DFF)',
  multi: 'linear-gradient(135deg,#FF6B6B,#FFD700,#6BCB77,#4D96FF,#C77DFF)',
  rainbow: 'linear-gradient(135deg,red,orange,yellow,green,blue,violet)',
};

const resolveColor = (raw: string): string => {
  if (!raw) return '#CCCCCC';
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  if (trimmed.startsWith('#') || trimmed.startsWith('linear-gradient') || trimmed.startsWith('rgb')) {
    return trimmed;
  }
  return FAST_COLORS[lower] || lower;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getOptimizedImageUrl = (url: string, width = 750): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;
  // f_auto, q_auto reduces image size by 70% without visible loss
  return `${parts[0]}/upload/w_${width},q_auto,f_auto,dpr_auto/${parts[1]}`;
};

const getImageAlt = (
  productName: string,
  selectedColor: string,
  selectedSize: string,
  index: number,
): string => {
  const colorText = selectedColor ? ` in ${selectedColor}` : '';
  const sizeText = selectedSize ? ` size ${selectedSize}` : '';
  return `${productName}${colorText}${sizeText} — photo ${index + 1} | ${BRAND.fullName}`;
};

const getStockInfo = (stock: number) => {
  if (stock === 0) return { status: 'out-of-stock', message: 'Out of Stock', urgent: false, color: 'red' };
  if (stock <= 5) return { status: 'low-stock', message: `Only ${stock} left in stock!`, urgent: true, color: 'orange' };
  if (stock <= 10) return { status: 'limited-stock', message: `Limited stock: ${stock} available`, urgent: true, color: 'orange' };
  return { status: 'in-stock', message: 'In Stock', urgent: false, color: 'green' };
};

const normalise = (p: any): Product => ({
  id: p.id,
  name: p.name || '',
  slug: p.slug || '',
  description: p.description || '',
  shortDescription: p.short_description || '',
  price: Number(p.price) || 0,
  comparePrice: p.compare_price ? Number(p.compare_price) : 0,
  images: Array.isArray(p.images) ? p.images : [],
  videoUrl: p.video_url || '',
  category: p.category_name || p.category || '',
  categorySlug: p.category_slug || '',
  sizes: Array.isArray(p.sizes) ? p.sizes : [],
  colors: Array.isArray(p.colors) ? p.colors : [],
  stock: Number(p.stock) || 0,
  sku: p.sku || '',
  tags: Array.isArray(p.tags) ? p.tags : [],
  seoTitle: p.seo_title || '',
  seoKeywords: p.seo_keywords || '',
  customText: p.custom_text || '',
  isFeatured: p.is_featured || false,
  isTrending: p.is_trending || false,
  isNewArrival: p.is_new_arrival || false,
  isOnSale: p.is_on_sale || false,
  rating: Number(p.rating) || 0,
  reviewCount: Number(p.review_count) || 0,
  createdAt: p.created_at || '',
  updatedAt: p.updated_at || '',
});

const ORIGIN = SITE.domain.replace(/\/$/, '');

// ─── Server-side fetcher (used by getStaticProps) ─────────────────────────────
// Avoids importing the anon-keyed `supabase` client into the build step, so
// `next build` works without NEXT_PUBLIC_SUPABASE_* on the build host. Falls
// back to the anon client if the service-role key isn't configured.
const getServerSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  // Lazy require so this never runs in the browser bundle.
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key, { auth: { persistSession: false } });
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
const ProductSkeleton = memo(() => (
  <div className="min-h-screen pt-24 pb-16" aria-busy="true">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
        <div className="aspect-[3/4] rounded-3xl bg-gray-200 animate-pulse w-full" />
        <div className="space-y-4 pt-2">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  </div>
));
ProductSkeleton.displayName = 'ProductSkeleton';

// ─── Component ────────────────────────────────────────────────────────────────
interface ProductDetailPageProps {
  initialProduct?: Product | null;
  initialRelated?: Product[];
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  initialProduct = null,
  initialRelated = [],
}) => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const addRecentlyViewed = useRecentlyViewedStore((s) => s.addProduct);

  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [related, setRelated] = useState<Product[]>(initialRelated);
  const [loading, setLoading] = useState<boolean>(!initialProduct);
  const [notFound, setNotFound] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [similarPage, setSimilarPage] = useState(0);
  const [showStickyCart, setShowStickyCart] = useState(false);
  const [, setSizeWarning] = useState(false);

  const thumbsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // ── Optimized Scroll Listener (IntersectionObserver style / throttled) ──────
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setShowStickyCart(window.scrollY > 450);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Fetch Product & Preload All Gallery Images ──────────────────────────────
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const fetchProduct = async () => {
      // Only show the skeleton when there's nothing pre-rendered to show —
      // otherwise hydration would unmount the SSG <Head> and its meta tags.
      if (!initialProduct || initialProduct.slug !== slug) setLoading(true);
      setNotFound(false);

      const imgParam = parseInt(searchParams.get('img') || '0', 10);
      const initialIdx = Number.isFinite(imgParam) && imgParam >= 0 ? imgParam : 0;
      setSelectedImage(initialIdx);

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('slug', slug)
          .single();

        if (cancelled) return;

        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const normalised = normalise(data);
        setProduct(normalised);
        setSelectedImage(Math.min(initialIdx, Math.max(normalised.images.length - 1, 0)));

        // Instant Preloading of ALL gallery images in background
        if (normalised.images.length > 0) {
          normalised.images.forEach((imgUrl) => {
            if (imgUrl?.startsWith('http')) {
              const img = new Image();
              img.src = getOptimizedImageUrl(imgUrl, 750);
            }
          });
        }

        setSelectedSize(normalised.sizes[0] || '');
        const firstColor = normalised.colors[0];
        setSelectedColor(
          typeof firstColor === 'string'
            ? firstColor
            : firstColor?.name || firstColor?.label || '',
        );

        addRecentlyViewed(normalised.id);

        // Async Non-blocking Analytics
        setTimeout(() => {
          trackViewContent({
            id: normalised.id,
            name: normalised.name,
            price: normalised.price,
          });
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ ecommerce: null });
          window.dataLayer.push({
            event: 'view_item',
            ecommerce: {
              currency: SITE.currency.code,
              value: normalised.price,
              items: [{
                item_id: normalised.id,
                item_name: normalised.name,
                item_category: normalised.category,
                price: normalised.price,
                quantity: 1,
              }],
            },
          });
        }, 100);

        // Fetch Related Products
        if (normalised.categorySlug) {
          supabase
            .from('products')
            .select('*')
            .eq('category_slug', normalised.categorySlug)
            .neq('id', normalised.id)
            .limit(8)
            .then(({ data: relatedData }) => {
              if (!cancelled) setRelated((relatedData || []).map(normalise));
            });
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProduct();
    return () => {
      cancelled = true;
    };
  }, [slug, addRecentlyViewed, searchParams, initialProduct]);

  // ── Auto scroll active thumbnail into view ─────────────────────────────────
  useEffect(() => {
    if (!thumbsRef.current) return;
    const strip = thumbsRef.current;
    const idx = selectedImage === -1 ? strip.children.length - 1 : selectedImage;
    const activeThumb = strip.children[idx] as HTMLElement | undefined;
    activeThumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedImage]);

  // ── Cart Handlers ──────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(() => {
    if (!product) return;
    if (!selectedSize && product.sizes.length > 0) return;

    addItem(product, selectedSize, selectedColor, quantity);

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }, [product, selectedSize, selectedColor, quantity, addItem]);

  const handleBuyNow = useCallback(() => {
    if (!product) return;
    if (!selectedSize && product.sizes.length > 0) {
      setSizeWarning(true);
      setTimeout(() => setSizeWarning(false), 2000);
      return;
    }
    addItem(product, selectedSize, selectedColor, quantity);
    navigate('/checkout');
  }, [product, selectedSize, selectedColor, quantity, addItem, navigate]);

  // ── Touch Swipe Handling (Smooth & Lightweight) ───────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!product || product.images.length <= 1) return;
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;

    // Check if horizontal swipe was more intentional than vertical scroll
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        // Swipe Left -> Next Image
        setSelectedImage((i) => (i === -1 ? 0 : Math.min(i + 1, product.images.length - 1)));
      } else {
        // Swipe Right -> Prev Image
        setSelectedImage((i) => (i === -1 ? product.images.length - 1 : Math.max(i - 1, 0)));
      }
    }
  }, [product]);

  // ── SEO Data Memo ──────────────────────────────────────────────────────────
  const seoData = useMemo(() => {
    if (!product) return null;

    const canonical = `${ORIGIN}/product/${product.slug}`;
    const pageTitle = product.seoTitle?.trim() || `${product.name} | ${BRAND.fullName}`;
    const stockInfo = getStockInfo(product.stock);

    const priceStr = product.comparePrice
      ? `Special price: ${SITE.currency.symbol}${product.price} (was ${SITE.currency.symbol}${product.comparePrice})`
      : `Price: ${SITE.currency.symbol}${product.price}`;

    const rawDesc = product.shortDescription || product.description || '';
    const metaDescription = rawDesc
      ? rawDesc.slice(0, 155)
      : `Buy ${product.name} at ${BRAND.fullName}. ${priceStr}. ${stockInfo.message}.`;

    const autoKeywords = [
      product.name, product.category, BRAND.fullName,
      `buy ${product.name}`, `${product.name} Bangladesh`,
      ...(product.tags || []),
    ].filter(Boolean).join(', ');

    const keywords = product.seoKeywords?.trim() || autoKeywords;
    const ogImage = product.images[0]?.startsWith('http')
      ? getOptimizedImageUrl(product.images[0], 1000)
      : `${ORIGIN}/images/og-image.jpg`;

    const availability = product.stock === 0
      ? 'https://schema.org/OutOfStock'
      : product.stock <= 5
        ? 'https://schema.org/LimitedAvailability'
        : 'https://schema.org/InStock';

    const priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const productSchema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${canonical}#product`,
      name: product.name,
      description: product.description || product.shortDescription || product.name,
      image: product.images.filter((img) => img.startsWith('http')).map((img) => getOptimizedImageUrl(img, 1000)),
      sku: product.sku || product.id,
      brand: { '@type': 'Brand', name: BRAND.fullName, url: ORIGIN },
      category: product.category,
      offers: {
        '@type': 'Offer',
        '@id': `${canonical}#offer`,
        url: canonical,
        priceCurrency: SITE.currency.code,
        price: product.price,
        priceValidUntil,
        availability,
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: BRAND.fullName, url: ORIGIN },
      },
    };

    return {
      canonical, pageTitle, metaDescription, keywords, ogImage,
      productSchema: JSON.stringify(productSchema),
    };
  }, [product]);

  if (loading) return <ProductSkeleton />;

  if (notFound || !product) {
    return (
      <div className="min-h-[70vh] pt-24 flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Product Not Found</h1>
          <p className="text-gray-600 mb-6">The product you are looking for is unavailable.</p>
          <Button onClick={() => navigate('/shop')}>Back to Shop</Button>
        </div>
      </div>
    );
  }

  const totalThumbs = product.images.length + (product.videoUrl ? 1 : 0);
  const stockInfo = getStockInfo(product.stock);
  const discountPercent = product.comparePrice
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  return (
    <>
      {/* ── SEO Metadata ── */}
      {seoData && (
        <Head>
          <title>{seoData.pageTitle}</title>
          <meta name="description" content={seoData.metaDescription} />
          <meta name="keywords" content={seoData.keywords} />
          <link rel="canonical" href={seoData.canonical} />
          <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
          <meta property="og:type" content="product" />
          <meta property="og:site_name" content={BRAND.fullName} />
          <meta property="og:title" content={seoData.pageTitle} />
          <meta property="og:description" content={seoData.metaDescription} />
          <meta property="og:url" content={seoData.canonical} />
          <meta property="og:image" content={seoData.ogImage} />
          <meta property="product:price:amount" content={String(product.price)} />
          <meta property="product:price:currency" content={SITE.currency.code} />
          <meta property="product:availability" content={product.stock > 0 ? 'in stock' : 'out of stock'} />
          <script type="application/ld+json">{seoData.productSchema}</script>
        </Head>
      )}

      <div className="min-h-screen pt-20 md:pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500 mb-6 overflow-hidden text-ellipsis whitespace-nowrap">
            <Link to="/" className="hover:text-rose-gold transition-colors">Home</Link>
            <ChevronRight size={14} className="flex-shrink-0" />
            <Link to="/shop" className="hover:text-rose-gold transition-colors">Shop</Link>
            {product.categorySlug && (
              <>
                <ChevronRight size={14} className="flex-shrink-0" />
                <Link to={`/category/${product.categorySlug}`} className="hover:text-rose-gold transition-colors">
                  {product.category}
                </Link>
              </>
            )}
            <ChevronRight size={14} className="flex-shrink-0" />
            <span className="text-gray-900 font-medium truncate">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-start">

            {/* ── IMAGE GALLERY (Instant Switch & Pre-loaded) ── */}
            <div className="w-full">
              {/* Main Image Container */}
              <div
                className="relative rounded-2xl md:rounded-3xl overflow-hidden aspect-[3/4] bg-gray-100 shadow-sm touch-pan-y"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {selectedImage === -1 && product.videoUrl ? (
                  <video
                    src={product.videoUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  /* Render all images layered with CSS opacity to achieve 0ms lag upon switching */
                  product.images.map((img, index) => (
                    <img
                      key={img + index}
                      src={getOptimizedImageUrl(img, 750)}
                      alt={getImageAlt(product.name, selectedColor, selectedSize, index)}
                      width={750}
                      height={1000}
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding={index === 0 ? 'sync' : 'async'}
                      fetchPriority={index === 0 ? 'high' : 'low'}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ease-out ${selectedImage === index ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                        }`}
                    />
                  ))
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3 md:top-4 md:left-4 z-20 flex flex-col gap-1.5">
                  {product.isOnSale && <Badge variant="sale">Sale</Badge>}
                  {product.isNewArrival && <Badge variant="new">New</Badge>}
                  {product.isTrending && <Badge variant="trending">Trending</Badge>}
                  {product.comparePrice && discountPercent > 0 && (
                    <Badge variant="sale">{discountPercent}% OFF</Badge>
                  )}
                </div>

                {/* Wishlist Button */}
                <button
                  type="button"
                  className="absolute top-3 right-3 md:top-4 md:right-4 z-20 w-9 h-9 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-transform active:scale-90 shadow-sm"
                  aria-label="Add to wishlist"
                >
                  <Heart size={18} className="text-rose-gold" />
                </button>

                {/* Left/Right Arrows */}
                {selectedImage > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedImage((i) => i - 1)}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-md active:scale-95 transition-all"
                    aria-label="Previous image"
                  >
                    <ArrowLeft size={16} className="text-gray-800" />
                  </button>
                )}
                {selectedImage < product.images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedImage((i) => i + 1)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white shadow-md active:scale-95 transition-all"
                    aria-label="Next image"
                  >
                    <ArrowRight size={16} className="text-gray-800" />
                  </button>
                )}
              </div>

              {/* Thumbnails Strip */}
              {totalThumbs > 1 && (
                <div className="flex items-center gap-2 mt-3.5">
                  <div
                    ref={thumbsRef}
                    className="flex gap-2 overflow-x-auto py-1 scroll-smooth no-scrollbar flex-1"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {product.images.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedImage(i)}
                        className={`flex-shrink-0 w-16 h-20 md:w-20 md:h-24 rounded-xl overflow-hidden bg-gray-100 transition-all duration-150 relative ${i === selectedImage
                            ? 'ring-2 ring-rose-gold scale-[1.02] opacity-100'
                            : 'opacity-60 hover:opacity-100'
                          }`}
                      >
                        <img
                          src={getOptimizedImageUrl(img, 180)}
                          alt=""
                          loading="lazy"
                          width={80}
                          height={96}
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      </button>
                    ))}

                    {/* Video Thumb */}
                    {product.videoUrl && (
                      <button
                        type="button"
                        onClick={() => setSelectedImage(-1)}
                        className={`flex-shrink-0 w-16 h-20 md:w-20 md:h-24 rounded-xl overflow-hidden bg-gray-900 transition-all duration-150 relative ${selectedImage === -1 ? 'ring-2 ring-rose-gold opacity-100' : 'opacity-60 hover:opacity-100'
                          }`}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                            <span className="text-rose-gold text-xs ml-0.5">▶</span>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── PRODUCT DETAILS ── */}
            <div className="flex flex-col">
              {/* Category */}
              {product.category && (
                <Link
                  to={product.categorySlug ? `/category/${product.categorySlug}` : '#'}
                  className="text-xs uppercase tracking-wider text-rose-gold font-semibold mb-1 hover:underline inline-block"
                >
                  {product.category}
                </Link>
              )}

              {/* Title */}
              <h1 className="heading-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                {product.name}
              </h1>

              {/* Rating */}
              {product.reviewCount > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-0.5 text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={15}
                        className={i < Math.floor(product.rating) ? 'fill-current' : 'text-gray-200'}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{product.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">({product.reviewCount} reviews)</span>
                </div>
              )}

              {/* Price */}
              <div className="mb-4">
                <PriceDisplay price={product.price} comparePrice={product.comparePrice} size="lg" />
              </div>

              {/* Stock Alerts */}
              {stockInfo.urgent && stockInfo.status !== 'out-of-stock' && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-xs sm:text-sm font-medium mb-4">
                  <AlertCircle size={16} />
                  <span>{stockInfo.message}</span>
                </div>
              )}

              {stockInfo.status === 'out-of-stock' && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium mb-4">
                  <AlertCircle size={16} />
                  <span>Out of stock</span>
                </div>
              )}

              {/* Short Description */}
              <p className="text-gray-600 text-sm md:text-base leading-relaxed mb-6">
                {product.description || product.shortDescription}
              </p>

              <div className="h-px bg-gray-100 mb-6" />

              {/* ── Color Swatches ── */}
              {product.colors.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Color: <span className="font-normal text-gray-500 capitalize">{selectedColor}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {product.colors.map((color: any) => {
                      const colorName = typeof color === 'string' ? color : color.name || color.label || String(color);
                      const rawValue = typeof color === 'string' ? color : color.hex || color.value || color.name || '';
                      const resolvedBg = resolveColor(rawValue);
                      const isSelected = selectedColor === colorName;

                      return (
                        <button
                          key={colorName}
                          type="button"
                          onClick={() => setSelectedColor(colorName)}
                          title={colorName}
                          className={`w-8 h-8 rounded-full border-2 transition-transform active:scale-90 ${isSelected ? 'ring-2 ring-rose-gold ring-offset-2 scale-110 border-white' : 'border-gray-200'
                            }`}
                          style={{
                            background: resolvedBg,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Sizes ── */}
              {product.sizes.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Size: <span className="font-normal text-gray-500">{selectedSize}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => {
                      const isSelected = selectedSize === size;
                      return (
                        <button
                          key={String(size)}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={`h-9 min-w-[50px] px-3 rounded-lg text-xs font-medium transition-all ${isSelected
                              ? 'bg-gray-900 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Info Box */}
              {product.customText && (
                <div className="mb-5 p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-xs leading-relaxed text-gray-700 whitespace-pre-line">
                  {product.customText}
                </div>
              )}

              {/* ── Quantity & Actions ── */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">Quantity</span>
                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={product.stock === 0}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-9 text-center text-xs font-semibold text-gray-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
                    disabled={product.stock === 0 || quantity >= product.stock}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                  className="flex-[3] h-12 rounded-xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
                  style={{
                    backgroundColor: product.stock === 0 ? '#E5E7EB' : UI.button.primary.background,
                    color: product.stock === 0 ? '#9CA3AF' : UI.button.primary.text,
                  }}
                >
                  <ShoppingBag size={18} />
                  {product.stock === 0 ? 'Out of Stock' : 'Buy Now'}
                </button>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className={`flex-[2] h-12 rounded-xl text-sm font-semibold border-2 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${addedToCart
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-rose-gold text-rose-gold hover:bg-rose-50'
                    } disabled:opacity-40`}
                >
                  {addedToCart ? (
                    <>
                      <Check size={16} /> Added
                    </>
                  ) : (
                    'Add to Bag'
                  )}
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 py-3 px-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-base mb-0.5">🚚</span>
                  <span className="text-[11px] font-medium text-gray-600">Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-base mb-0.5">✨</span>
                  <span className="text-[11px] font-medium text-gray-600">100% Authentic</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-base mb-0.5">🔒</span>
                  <span className="text-[11px] font-medium text-gray-600">Secure Checkout</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Related Products ── */}
          {related.length > 0 && (
            <section className="mt-16 pt-10 border-t border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="heading-serif text-xl sm:text-2xl font-bold text-gray-900">
                  You May Also Like
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSimilarPage((p) => Math.max(0, p - 1))}
                    disabled={similarPage === 0}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:border-rose-gold transition-colors"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimilarPage((p) => Math.min(Math.ceil(related.length / 4) - 1, p + 1))}
                    disabled={similarPage >= Math.ceil(related.length / 4) - 1}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-30 hover:border-rose-gold transition-colors"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
                {related.slice(similarPage * 4, similarPage * 4 + 4).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

        </div>

        {/* ── Sticky Mobile Bar ── */}
        {showStickyCart && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 p-3 md:hidden z-50 flex items-center justify-between gap-3 shadow-lg">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total Price</p>
              <p className="text-base font-bold text-gray-900">
                {SITE.currency.symbol}{product.price * quantity}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="flex-1 max-w-[200px] h-11 bg-rose-gold text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <ShoppingBag size={16} />
              {product.stock === 0 ? 'Out of Stock' : addedToCart ? 'Added!' : 'Add to Bag'}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

ProductDetailPage.getLayout = function getLayout(page: React.ReactElement) {
  return <CustomerLayout>{page}</CustomerLayout>;
};

// ─── ISR: pre-build the most-recent products, regenerate the rest on demand ──
export const getStaticPaths: GetStaticPaths = async () => {
  const client = getServerSupabase();
  if (!client) {
    // No Supabase creds at build time — let Next render every slug on demand.
    return { paths: [], fallback: 'blocking' };
  }

  try {
    const { data, error } = await client
      .from('products')
      .select('slug, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      return { paths: [], fallback: 'blocking' };
    }

    return {
      paths: data
        .filter((p: { slug: string | null }) => Boolean(p.slug))
        .map((p: { slug: string }) => ({ params: { slug: p.slug } })),
      // Any slug not in the list is generated on first request and cached.
      fallback: 'blocking',
    };
  } catch {
    return { paths: [], fallback: 'blocking' };
  }
};

export const getStaticProps: GetStaticProps<{
  initialProduct: Product | null;
  initialRelated: Product[];
}> = async (ctx) => {
  const slug = ctx.params?.slug;
  if (typeof slug !== 'string' || !slug) {
    return { notFound: true, revalidate: 60 };
  }

  const client = getServerSupabase();
  if (!client) {
    // Can't fetch at build time — let the client component handle it and
    // revalidate this empty shell quickly.
    return { props: { initialProduct: null, initialRelated: [] }, revalidate: 60 };
  }

  try {
    const { data, error } = await client
      .from('products')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return { notFound: true, revalidate: 60 };
    }

    const product = normalise(data);

    let related: Product[] = [];
    if (product.categorySlug) {
      const { data: relatedData } = await client
        .from('products')
        .select('*')
        .eq('category_slug', product.categorySlug)
        .neq('id', product.id)
        .limit(8);
      related = (relatedData || []).map(normalise);
    }

    return {
      props: { initialProduct: product, initialRelated: related },
      // Regenerate at most once a minute — keeps price/stock roughly fresh
      // without hammering Supabase on every visit.
      revalidate: 60,
    };
  } catch {
    return { notFound: true, revalidate: 60 };
  }
};

export default ProductDetailPage;
