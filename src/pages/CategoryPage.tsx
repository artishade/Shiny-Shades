// dataLayer is typed globally in cartStore.ts — no duplicate declare needed here

import React, {
  useState, useEffect, useMemo, useCallback, memo,
} from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight } from 'lucide-react';

import { ProductCard } from '@/components/home';
import { FadeIn, Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useCategoryStore } from '@/store';
import { SITE } from '@/config/siteConfig';
import { BRAND } from '@/config/brandingConfig';
import type { Product } from '@/types';

// Strip trailing slash once — used in all canonical / schema URLs
const ORIGIN = SITE.domain.replace(/\/$/, '');

// ─── Skeleton card — extracted so it never re-allocates inside the grid ───────
const SkeletonCard = memo(() => (
  <div aria-hidden="true">
    <div className="rounded-2xl aspect-[3/4] bg-blush-light/40 animate-pulse" />
    <div className="pt-3 px-1 space-y-2">
      <div className="h-3 w-1/3 rounded bg-blush-light/60 animate-pulse" />
      <div className="h-4 w-3/4 rounded bg-blush-light/60 animate-pulse" />
      <div className="h-4 w-1/2 rounded bg-blush-light/60 animate-pulse" />
    </div>
  </div>
));
SkeletonCard.displayName = 'SkeletonCard';

// ─── Normalise Supabase snake_case row → Product domain shape ─────────────────
// Defined at module scope — pure function, zero allocation per render
const normaliseRow = (p: any): Product => ({
  id: p.id,
  name: p.name ?? '',
  slug: p.slug ?? '',
  description: p.description ?? '',
  shortDescription: p.short_description ?? '',
  price: Number(p.price) || 0,
  comparePrice: p.compare_price ? Number(p.compare_price) : undefined,
  images: Array.isArray(p.images) ? p.images : [],
  videoUrl: p.video_url ?? '',
  category: p.category_name ?? p.category ?? '',
  categorySlug: p.category_slug ?? '',
  sizes: Array.isArray(p.sizes) ? p.sizes : [],
  colors: Array.isArray(p.colors) ? p.colors : [],
  stock: Number(p.stock) || 0,
  sku: p.sku ?? '',
  tags: Array.isArray(p.tags) ? p.tags : [],
  customText: p.custom_text ?? '',
  isFeatured: Boolean(p.is_featured),
  isTrending: Boolean(p.is_trending),
  isNewArrival: Boolean(p.is_new_arrival),
  isOnSale: Boolean(p.is_on_sale),
  rating: Number(p.rating) || 0,
  reviewCount: Number(p.review_count) || 0,
  createdAt: p.created_at ?? '',
  updatedAt: p.updated_at ?? '',
});

// ─── Component ────────────────────────────────────────────────────────────────

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Category metadata — loaded at app boot, always available synchronously
  const { categories } = useCategoryStore();

  const category = useMemo(
    () => (slug ? categories.find((c) => c.slug === slug) : undefined),
    [slug, categories],
  );

  // ── Fetch products from Supabase ──────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const fetchProducts = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category_slug', slug)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error('[CategoryPage] Supabase error:', error);
        setProducts([]);
      } else {
        setProducts((data ?? []).map(normaliseRow));
      }

      setLoading(false);
    };

    fetchProducts();
    return () => { cancelled = true; };
  }, [slug]);

  // ── GTM — view_item_list (deferred so it never blocks first paint) ─────────
  useEffect(() => {
    if (products.length === 0) return;

    // setTimeout(0) yields to the browser's paint queue before pushing to GTM
    const id = setTimeout(() => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ ecommerce: null });
      window.dataLayer.push({
        event: 'view_item_list',
        ecommerce: {
          item_list_id: `category_${slug}`,
          item_list_name: category?.name || slug || 'Category',
          items: products.slice(0, 20).map((product, index) => ({
            item_id: product.id,
            item_name: product.name,
            item_category: product.category,
            price: product.price,
            index,
          })),
        },
      });
    }, 0);

    return () => clearTimeout(id);
  }, [products, category?.name, slug]);

  // ── SEO data — memoised; JSON.stringify called inside memo, not inside JSX ─
  const seoData = useMemo(() => {
    if (!category) return null;

    const canonical = `${ORIGIN}/category/${category.slug}`;
    const pageTitle = `${category.name} | ${BRAND.fullName}`;

    const countStr =
      !loading && products.length > 0
        ? ` Browse ${products.length} products.`
        : '';
    const rawDesc = category.description
      ? `${category.description}${countStr} Shop ${category.name} at ${BRAND.fullName} — fast delivery across Bangladesh.`
      : `Shop ${category.name} at ${BRAND.fullName}. Premium women's ${category.name.toLowerCase()} with fast delivery across Bangladesh.${countStr}`;
    const metaDescription =
      rawDesc.length > 160 ? rawDesc.slice(0, 157) + '...' : rawDesc;

    const ogImage = category.image?.startsWith('http')
      ? category.image
      : `${ORIGIN}/images/og-image.jpg`;

    // ── CollectionPage JSON-LD ───────────────────────────────────────────────
    const collectionPageSchema = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${canonical}#collectionpage`,
      name: category.name,
      description: category.description || metaDescription,
      url: canonical,
      inLanguage: 'en',
      isPartOf: {
        '@type': 'WebSite',
        '@id': `${ORIGIN}/#website`,
        name: BRAND.fullName,
        url: ORIGIN,
      },
      ...(category.image?.startsWith('http')
        ? { image: { '@type': 'ImageObject', url: category.image, name: `${category.name} — ${BRAND.fullName}` } }
        : {}),
      ...(!loading && products.length > 0 ? { numberOfItems: products.length } : {}),
    });

    // ── ItemList JSON-LD — only when products have loaded ───────────────────
    const itemListSchema =
      !loading && products.length > 0
        ? JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          '@id': `${canonical}#itemlist`,
          name: `${category.name} Products`,
          description: `All ${category.name} products at ${BRAND.fullName}`,
          url: canonical,
          numberOfItems: products.length,
          itemListElement: products.slice(0, 20).map((product, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${ORIGIN}/product/${product.slug}`,
            name: product.name,
            ...(product.images?.[0]?.startsWith('http') ? { image: product.images[0] } : {}),
          })),
        })
        : null;

    // ── BreadcrumbList JSON-LD ───────────────────────────────────────────────
    const breadcrumbSchema = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${canonical}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: `${ORIGIN}/shop` },
        { '@type': 'ListItem', position: 3, name: category.name, item: canonical },
      ],
    });

    return {
      canonical,
      pageTitle,
      metaDescription,
      ogImage,
      collectionPageSchema,
      itemListSchema,
      breadcrumbSchema,
    };
    // products and loading drive the ItemList / numberOfItems — must be deps
  }, [category, slug, products, loading]);

  // ─── Not-found state ─────────────────────────────────────────────────────
  // Category store loads at app boot — if still missing after that, it's a 404
  if (!category) {
    return (
      <>
        <Helmet>
          <title>{`Category Not Found | ${BRAND.fullName}`}</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>

        <div className="min-h-screen pt-24 flex items-center justify-center">
          <div className="text-center">
            <h1 className="heading-serif text-3xl font-bold text-charcoal mb-4">
              Category Not Found
            </h1>
            <p className="text-[#6B5B55] mb-6">
              This category doesn't exist or has been removed.
            </p>
            {/*
              Link with Button child causes a11y issues (nested interactives).
              Use Link styled as a button instead.
            */}
            <Link
              to="/shop"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base gap-2.5 font-medium rounded-xl bg-rose-gold text-white hover:bg-deep-rose shadow-lg transition-all duration-300 focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:ring-offset-2"
            >
              Back to Shop
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── SEO HEAD ────────────────────────────────────────────────────── */}
      {seoData && (
        <Helmet prioritizeSeoTags>
          {/* Primary */}
          <title>{seoData.pageTitle}</title>
          <meta name="description" content={seoData.metaDescription} />
          <meta
            name="keywords"
            content={[
              category.name,
              `${category.name} Bangladesh`,
              `buy ${category.name}`,
              `${category.name} online`,
              BRAND.fullName,
              'women fashion Bangladesh',
            ].join(', ')}
          />
          <meta
            name="robots"
            content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
          />

          {/* Canonical */}
          <link rel="canonical" href={seoData.canonical} />

          {/* Preconnect for LCP image (category hero image is above-the-fold) */}
          {category.image?.startsWith('https://res.cloudinary.com') && (
            <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
          )}

          {/* Open Graph — website type (categories are not products) */}
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content={BRAND.fullName} />
          <meta property="og:title" content={seoData.pageTitle} />
          <meta property="og:description" content={seoData.metaDescription} />
          <meta property="og:url" content={seoData.canonical} />
          <meta property="og:image" content={seoData.ogImage} />
          <meta property="og:image:secure_url" content={seoData.ogImage} />
          <meta property="og:image:type" content="image/jpeg" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content={`${category.name} collection — ${BRAND.fullName}`} />
          <meta property="og:locale" content="en_BD" />
          <meta property="og:locale:alternate" content="bn_BD" />

          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={seoData.pageTitle} />
          <meta name="twitter:description" content={seoData.metaDescription} />
          <meta name="twitter:image" content={seoData.ogImage} />
          <meta name="twitter:image:alt" content={`${category.name} collection — ${BRAND.fullName}`} />

          {/* JSON-LD — CollectionPage (pre-serialised in useMemo) */}
          <script type="application/ld+json">{seoData.collectionPageSchema}</script>

          {/* JSON-LD — ItemList (only after products load) */}
          {seoData.itemListSchema && (
            <script type="application/ld+json">{seoData.itemListSchema}</script>
          )}

          {/* JSON-LD — BreadcrumbList */}
          <script type="application/ld+json">{seoData.breadcrumbSchema}</script>
        </Helmet>
      )}

      {/* ── PAGE CONTENT ──────────────────────────────────────────────────── */}
      <div className="min-h-screen pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Breadcrumb — semantic nav landmark */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-sm text-[#6B5B55] mb-6"
          >
            <Link
              to="/"
              className="hover:text-rose-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:ring-offset-1 rounded"
            >
              Home
            </Link>
            <ChevronRight size={14} aria-hidden="true" />
            <Link
              to="/shop"
              className="hover:text-rose-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:ring-offset-1 rounded"
            >
              Shop
            </Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span className="text-charcoal font-medium" aria-current="page">
              {category.name}
            </span>
          </nav>

          {/* ── Hero Banner ──────────────────────────────────────────────── */}
          {/*
            NOT wrapped in <FadeIn> — the hero is above-the-fold, LCP content.
            Wrapping in FadeIn sets initial opacity:0 which delays the browser
            from painting it, hurting LCP directly. Static render is correct here.
          */}
          <div
            className="rounded-3xl p-8 md:p-12 mb-10 min-h-[220px] flex items-center relative overflow-hidden"
            style={{ background: category.gradient || '#F5E6DC' }}
          >
            {/*
              Category hero image — LCP candidate.
              - loading="eager" + fetchPriority="high" + decoding="sync":
                tells the browser to prioritise this above all other images.
              - Real <img> (not CSS background-image) so the preload scanner
                can discover it on the first HTML parse, before CSS runs.
              - Explicit width/height (intrinsic dimensions) prevent CLS.
                The container reserves min-h-[220px] but the img fills it
                via object-cover, so 1200×800 is a safe 3:2 aspect ratio.
              - aria-hidden + empty alt: purely decorative — the h1 text
                communicates the category. Screen readers skip decoration.
            */}
            {category.image?.startsWith('http') && (
              <img
                src={category.image}
                alt=""
                aria-hidden="true"
                loading="eager"
                decoding="sync"
                fetchPriority="high"
                width={1200}
                height={800}
                className="absolute inset-0 w-full h-full object-cover rounded-3xl"
              />
            )}

            {/* Dark scrim — improves H1 contrast over the image (WCAG AA) */}
            {category.image?.startsWith('http') && (
              <div className="absolute inset-0 bg-black/35 rounded-3xl" aria-hidden="true" />
            )}

            {/* Hero text */}
            <div className="relative z-10">
              {/*
                H1 — the category name is the sole top-level heading on this page.
                Colour adapts: white over images (drop-shadow ensures 4.5:1 contrast
                even on light photos), charcoal on gradient backgrounds.
              */}
              <h1
                className={`heading-serif text-3xl md:text-5xl font-bold mb-3 ${category.image?.startsWith('http')
                  ? 'text-white drop-shadow-lg'
                  : 'text-charcoal'
                  }`}
              >
                {category.name}
              </h1>

              {category.description && (
                <p
                  className={`max-w-xl leading-relaxed ${category.image?.startsWith('http')
                    ? 'text-white/90 drop-shadow'
                    : 'text-[#6B5B55]'
                    }`}
                >
                  {category.description}
                </p>
              )}

              {/*
                Product count — aria-live="polite" + aria-atomic="true" so
                screen readers announce the count once it changes from
                "Loading…" to the real number, without interrupting ongoing speech.
              */}
              <p
                className={`text-sm mt-4 ${category.image?.startsWith('http')
                  ? 'text-white/80'
                  : 'text-[#6B5B55]'
                  }`}
                aria-live="polite"
                aria-atomic="true"
              >
                {loading
                  ? 'Loading…'
                  : `${products.length} ${products.length === 1 ? 'product' : 'products'}`}
              </p>
            </div>
          </div>

          {/* ── Product Grid ──────────────────────────────────────────────── */}
          {loading ? (
            /*
              Skeleton grid — exact same column layout as the real product grid.
              Reserving the space before products load keeps CLS = 0.
            */
            <div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
              role="status"
              aria-label="Loading products"
              aria-busy="true"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              {/*
                H2 — correct hierarchy: H1 is the category name in the hero above.
              */}
              <h2 className="heading-serif text-2xl font-semibold text-charcoal mb-3">
                No Products Found
              </h2>
              <p className="text-[#6B5B55] mb-6">
                Products for this category will appear here soon.
              </p>
              {/* Same pattern as not-found: Link styled as button, not nested */}
              <Link
                to="/shop"
                className="inline-flex items-center justify-center px-8 py-3.5 text-base gap-2.5 font-medium rounded-xl border-2 border-rose-gold text-rose-gold hover:bg-rose-gold hover:text-white transition-all duration-300 focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:ring-offset-2"
              >
                Browse All Products
              </Link>
            </div>
          ) : (
            /*
              Semantic list — screen readers announce "X items" when navigating
              to the region. role="list" on <ul> + implicit role="listitem" on
              <li> gives the correct reading experience.

              list-none + p-0 + m-0 resets browser default list styling while
              keeping the semantic role intact (Tailwind's list-none alone can
              strip the role in some browsers — the explicit role on <ul> fixes it).
            */
            <ul
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 list-none p-0 m-0"
              aria-label={`${category.name} products, ${products.length} items`}
            >
              {products.map((product, index) => (
                <li key={product.id}>
                  {/*
                    Stagger only the first 8 cards — beyond that the cumulative
                    delay exceeds 480 ms which hurts perceived performance on
                    long product lists.

                    First 4 cards: above-the-fold on most viewports.
                    priority=true → ProductCard sets loading="eager" +
                    fetchPriority="high" on the product image, making it
                    eligible as the LCP element.
                  */}
                  <FadeIn delay={index < 8 ? index * 0.06 : 0}>
                    <ProductCard product={product} priority={index < 4} />
                  </FadeIn>
                </li>
              ))}
            </ul>
          )}

        </div>
      </div>
    </>
  );
};

export default CategoryPage;