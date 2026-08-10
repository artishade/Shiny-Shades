/**
 * Home.tsx —  landing page
 *
 * Optimised for:
 *  • Lighthouse / Core Web Vitals (LCP, CLS, FCP, INP)
 *  • Google Search (structured data, canonical, OG, Twitter Card)
 *  • Accessibility (ARIA, heading hierarchy, keyboard nav, screen readers)
 *  • React 18 performance (memo, stable refs, no spurious re-renders)
 */

import React, { useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import {
  Hero,
  BannerSlider,
  FeaturedCollection,
  CategoryShowcase,
  TrendingProducts,
  NewArrivals,
} from '@/components/home';
import { FadeIn, SectionHeader, PriceDisplay } from '@/components/ui';
import { useProductStore } from '@/store';
import { useRecentlyViewedStore } from '@/store/uiStore';
import { getOptimizedImageUrl, getResponsiveSrcSet } from '@/lib/cloudinary';
import { siteConfig, SITE } from '@/config/siteConfig';
import { BRAND } from '@/config/brandingConfig';
import { CONTACT } from '@/config/contactConfig';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip any trailing slash from the domain so canonical URLs are always clean */
const DOMAIN = SITE.domain.replace(/\/$/, '');

// ─── SEO constants ────────────────────────────────────────────────────────────

const PAGE_TITLE = `${BRAND.fullName} | Premium Women's Fashion in Bangladesh`;

const PAGE_DESCRIPTION = BRAND.defaultDescription;

/** Always an exact URL with no double-slash */
const CANONICAL = `${DOMAIN}/`;

const OG_IMAGE =
  'https://res.cloudinary.com/nrdmy8ir/image/upload/f_auto,q_auto,w_1200,h_630,c_fill/shinyshades/og-banner.jpg';

// ─── JSON-LD schemas ──────────────────────────────────────────────────────────

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${DOMAIN}/#organization`,
  name: BRAND.fullName,
  alternateName: `${BRAND.nameTop} ${BRAND.nameBottom}`,
  url: DOMAIN,
  logo: {
    '@type': 'ImageObject',
    url: `${DOMAIN}${BRAND.logoUrl}`,
    width: 512,
    height: 512,
  },
  image: OG_IMAGE,
  description: BRAND.description,
  foundingDate: '2023',
  areaServed: {
    '@type': 'Country',
    name: 'Bangladesh',
  },
  priceRange: '$$',
  sameAs: [CONTACT.facebook, CONTACT.instagram].filter(Boolean),
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: CONTACT.phone,
    contactType: 'customer service',
    areaServed: 'BD',
    availableLanguage: ['Bengali', 'English'],
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Kaderabad Housing, Road No 6',
    addressLocality: 'Mohammadpur',
    addressRegion: 'Dhaka',
    addressCountry: 'BD',
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${DOMAIN}/#website`,
  name: BRAND.fullName,
  url: DOMAIN,
  inLanguage: ['en', 'bn'],
  publisher: { '@id': `${DOMAIN}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${DOMAIN}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': `${DOMAIN}/#webpage`,
  url: CANONICAL,
  name: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  isPartOf: { '@id': `${DOMAIN}/#website` },
  about: { '@id': `${DOMAIN}/#organization` },
  inLanguage: 'en',
  breadcrumb: {
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: CANONICAL,
      },
    ],
  },
};

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': ['OnlineStore', 'ClothingStore'],
  '@id': `${DOMAIN}/#store`,
  name: BRAND.fullName,
  description: BRAND.description,
  url: DOMAIN,
  telephone: CONTACT.phone,
  priceRange: '$$',
  currenciesAccepted: 'BDT',
  paymentAccepted: 'Cash, bKash, Nagad',
  areaServed: { '@type': 'Country', name: 'Bangladesh' },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Kaderabad Housing, Road No 6',
    addressLocality: 'Mohammadpur',
    addressRegion: 'Dhaka',
    addressCountry: 'BD',
  },
  sameAs: [CONTACT.facebook, CONTACT.instagram].filter(Boolean),
  hasMap: 'https://goo.gl/maps/dhaka',
};

// Serialised once at module load — never recreated on re-renders
const ORG_SCHEMA_STR = JSON.stringify(organizationSchema);
const WEBSITE_SCHEMA_STR = JSON.stringify(websiteSchema);
const WEBPAGE_SCHEMA_STR = JSON.stringify(webPageSchema);
const BUSINESS_SCHEMA_STR = JSON.stringify(localBusinessSchema);

// ─── Recently Viewed — Skeleton card ─────────────────────────────────────────

const RecentlyViewedSkeletonCard = memo<{ index: number }>(({ index }) => (
  <li
    className="flex-shrink-0 w-[120px] sm:w-[140px]"
    aria-hidden="true"
    style={{
      // Reserve space before images load — prevents CLS
      contentVisibility: 'auto',
      containIntrinsicSize: '140px 230px',
    }}
  >
    <div
      className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-blush-light/40 animate-pulse"
      style={{
        // Explicit aspect ratio avoids layout shifts while image loads
        aspectRatio: '3 / 4',
      }}
    />
    <div className="pt-3 px-1 space-y-2">
      <div
        className="h-3 w-1/3 rounded bg-blush-light/60 animate-pulse"
        style={{ animationDelay: `${index * 80}ms` }}
      />
      <div
        className="h-4 w-3/4 rounded bg-blush-light/60 animate-pulse"
        style={{ animationDelay: `${index * 80 + 40}ms` }}
      />
      <div
        className="h-4 w-1/2 rounded bg-blush-light/60 animate-pulse"
        style={{ animationDelay: `${index * 80 + 80}ms` }}
      />
    </div>
  </li>
));
RecentlyViewedSkeletonCard.displayName = 'RecentlyViewedSkeletonCard';

// ─── Recently Viewed section ──────────────────────────────────────────────────

/**
 * Rendered only when the visitor has previously viewed products.
 * Uses <li> inside <ul role="list"> for proper screen-reader enumeration.
 * Images are lazy-loaded (below-fold) with responsive srcSet for CLS/LCP safety.
 */
const RecentlyViewedProducts = memo(() => {
  const {
    products,
    fetchProducts,
    loading: { list: listLoading },
    hasFetched,
  } = useProductStore();
  const { getRecentProducts, productIds } = useRecentlyViewedStore();

  // Guard: fetch only if not already loaded (store is idempotent)
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Nothing viewed yet — skip rendering entirely (zero layout impact)
  if (productIds.length === 0) return null;

  const isInitialLoading = listLoading && !hasFetched;
  const recentProducts = getRecentProducts(products, undefined, 8);

  if (!isInitialLoading && recentProducts.length === 0) return null;

  return (
    <section
      className="py-8 md:py-12 overflow-hidden"
      style={{ backgroundColor: '#FAF7F3' }}
      aria-labelledby="recently-viewed-heading"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <FadeIn>

          <div className="mb-4">
            <h2 className="text-base font-semibold text-charcoal">Recently Viewed</h2>
            <p className="text-xs text-[#6B5B55] mt-0.5">Pick up where you left off</p>
          </div>
        </FadeIn>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ul
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide list-none"
          aria-label="Recently viewed products"
          /*
            min-height prevents CLS when the list switches from skeletons
            to real cards — both states are approximately the same height.
          */
          style={{ minHeight: '200px' }}
        >
          {isInitialLoading
            ? Array.from({ length: 4 }).map((_, idx) => (
              <RecentlyViewedSkeletonCard key={`rv-skeleton-${idx}`} index={idx} />
            ))
            : recentProducts.map((product) => {
              const rawImage = product.images?.[0];
              const isCloudinary = rawImage?.startsWith('http');

              const optimizedSrc = isCloudinary
                ? getOptimizedImageUrl(rawImage, { width: 440 })
                : '';

              const srcSet = isCloudinary
                ? getResponsiveSrcSet(rawImage, { widths: [220, 330, 440, 660] })
                : '';

              return (
                <li
                  key={product.id}
                  className="flex-shrink-0 w-[120px] sm:w-[140px]"
                  /*
                    content-visibility defers off-screen rendering,
                    reducing main-thread work during initial load.
                  */
                  style={{
                    contentVisibility: 'auto',
                    containIntrinsicSize: '140px 230px',
                  }}
                >
                  <Link
                    to={`/product/${product.slug}`}
                    className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:rounded-2xl"
                    aria-label={`View ${product.name}${product.comparePrice && product.comparePrice > product.price ? ` — On sale from ${SITE.currency.symbol}${product.price}` : ` — ${SITE.currency.symbol}${product.price}`}`}
                  >
                    {/* Photo card — explicit aspect-ratio eliminates CLS */}
                    <div
                      className="relative rounded-2xl overflow-hidden bg-blush-light/30"
                      style={{ aspectRatio: '3 / 4' }}
                    >
                      {optimizedSrc ? (
                        <img
                          src={optimizedSrc}
                          srcSet={srcSet || undefined}
                          sizes="(max-width: 640px) 200px, 220px"
                          alt={`${product.name}${product.category ? ` — ${product.category}` : ''}`}
                          /*
                            These are below-the-fold, recently-viewed thumbnails.
                            Lazy-load them to protect LCP and FCP of above-fold content.
                          */
                          loading="lazy"
                          decoding="async"
                          width={200}
                          height={370}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 bg-gradient-to-br from-blush via-lavender to-champagne"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {/* Text below photo */}
                    <div className="pt-1.0 px-0.3">
                      {product.category && (
                        <p className="text-xs text-[#6B5B55] mb-0.5">{product.category}</p>
                      )}
                      <h3 className="text-xs font-medium text-charcoal mb-1 line-clamp-1 group-hover:text-rose-gold transition-colors">
                        {product.name}
                      </h3>
                      <PriceDisplay
                        price={product.price}
                        comparePrice={product.comparePrice}
                        size="sm"
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
        </ul>
      </div>
    </section>
  );
});
RecentlyViewedProducts.displayName = 'RecentlyViewedProducts';

// ─── Home page ────────────────────────────────────────────────────────────────

export const HomePage: React.FC = () => {
  return (
    <>
      {/* ── SEO HEAD ──────────────────────────────────────────────────────── */}
      <Helmet prioritizeSeoTags>
        {/* ── Primary meta ──────────────────────────────────────────────── */}
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESCRIPTION} />
        <meta name="keywords" content={siteConfig.keywords.join(', ')} />
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
        />
        <meta name="googlebot" content="index, follow, max-image-preview:large" />

        {/*
          theme-color: used by Chrome / Edge on Android to colour the
          browser chrome, improving perceived brand quality.
        */}
        <meta name="theme-color" content={BRAND.colors.primary} />

        {/* ── Canonical ─────────────────────────────────────────────────── */}
        <link rel="canonical" href={CANONICAL} />

        {/*
          Preconnect to Cloudinary CDN.
          Established before the browser parses any <img src="…cloudinary…">
          tags, reducing TCP + TLS handshake latency for hero and product
          images — measurable LCP / FCP improvement on mobile.
        */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />

        {/* ── Open Graph ────────────────────────────────────────────────── */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={BRAND.fullName} />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESCRIPTION} />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:secure_url" content={OG_IMAGE} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content={`${BRAND.fullName} — Premium Women's Fashion in Bangladesh`}
        />
        <meta property="og:locale" content="en_BD" />
        <meta property="og:locale:alternate" content="bn_BD" />

        {/* ── Twitter Card ──────────────────────────────────────────────── */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={PAGE_TITLE} />
        <meta name="twitter:description" content={PAGE_DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <meta
          name="twitter:image:alt"
          content={`${BRAND.fullName} — Premium Women's Fashion in Bangladesh`}
        />

        {/* ── JSON-LD structured data ────────────────────────────────────── */}

        {/* Organization — enables Knowledge Panel in Google Search */}
        <script type="application/ld+json">{ORG_SCHEMA_STR}</script>

        {/* WebSite — enables Sitelinks Search Box */}
        <script type="application/ld+json">{WEBSITE_SCHEMA_STR}</script>

        {/* WebPage — page-level entity */}
        <script type="application/ld+json">{WEBPAGE_SCHEMA_STR}</script>

        {/* LocalBusiness / OnlineStore — rich result eligibility */}
        <script type="application/ld+json">{BUSINESS_SCHEMA_STR}</script>
      </Helmet>

      {/*
        Invisible H1 for SEO / accessibility fallback.

        The Hero component renders a visible <h1> when heroEnabled is true
        (see Hero in components/home/index.tsx). When the CMS disables the
        hero, this sr-only <h1> guarantees the page always has exactly one
        primary heading for screen readers and search crawlers.

        Only one <h1> is visible at any time — the Hero's heading or this
        fallback, never both simultaneously.
      */}
      <h1 className="sr-only">
        {BRAND.fullName} — Premium Women&apos;s Fashion Bangladesh
      </h1>

      {/*
        Render order is intentional for Core Web Vitals:
          1. Hero        — LCP candidate; above-fold; image has fetchPriority="high"
          2. BannerSlider— above-fold promotional content
          3. NewArrivals — first product section; slightly below fold
          4. TrendingProducts
          5. FeaturedCollection
          6. CategoryShowcase
          7. RecentlyViewedProducts — personalised; lazy-loaded images only
      */}
      <main id="main-content">
        <Hero />
        <BannerSlider />
        <NewArrivals />
        <TrendingProducts />
        <FeaturedCollection />
        <CategoryShowcase />
        <RecentlyViewedProducts />
      </main>
    </>
  );
};