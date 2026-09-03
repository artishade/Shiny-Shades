/* ===================================================
    - Customer-facing layout shell
    Ported from src/App.tsx's <CustomerLayout> + <DefaultSEO>.
    react-router's <Outlet /> is replaced with a `children` prop,
    applied per-page via `Page.getLayout` (see src/pages/_app.tsx).
   =================================================== */

import { memo, type ReactNode } from 'react';
import Head from 'next/head';
import { useLocation } from '@/lib/routerCompat';

import { SITE, siteConfig } from '@/config/siteConfig';
import { BRAND } from '@/config/brandingConfig';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { useContentStore } from '@/store/contentStore';

// ─── Canonical origin (strip trailing slash once) ────────────────────────────

const ORIGIN = SITE.domain.replace(/\/$/, '');

// ─── Org JSON-LD (stable — defined outside render) ───────────────────────────

const ORG_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BRAND.fullName,
  url: ORIGIN,
  logo: `${ORIGIN}${BRAND.logoUrl}`,
  description: BRAND.description,
  sameAs: [SITE.instagram, SITE.facebook].filter(Boolean),
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['Bengali', 'English'],
  },
});

const WEBSITE_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: BRAND.fullName,
  url: ORIGIN,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${ORIGIN}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
});

// ─── Default SEO — site-wide fallback for every page ─────────────────────────
// Uses live siteSettings from Supabase if available; falls back to siteConfig.ts.
// A page-level <SEO> component (src/components/SEO.tsx) rendered further down
// the tree overrides these tags — next/head merges/de-dupes multiple <Head>
// instances the same way react-helmet-async merged multiple <Helmet>s.
// Route-independent tags (favicons, manifest, theme-color, verification) are
// emitted once in _document.tsx and deliberately not repeated here.

const DefaultSEO = memo(() => {
  const { pathname } = useLocation();
  const settings = useContentStore((s) => s.content.siteSettings);

  const siteName = settings.siteName || siteConfig.websiteName;
  const title = settings.defaultTitle || siteConfig.defaultTitle;
  const description = settings.defaultDescription || siteConfig.defaultDescription;
  const keywords = (settings.keywords?.length ? settings.keywords : siteConfig.keywords).join(', ');
  const ogImage = settings.ogImage || siteConfig.ogImage;
  const twitterHandle = settings.twitterHandle || '';

  const canonical = `${ORIGIN}${pathname === '/' ? '' : pathname}`;
  const ogImageAbsolute = ogImage.startsWith('http') ? ogImage : `${ORIGIN}${ogImage}`;

  return (
    <Head>
      {/* ── Primary meta ─────────────────────────────────────────── */}
      {/* Keys must match src/components/SEO.tsx so page-level tags replace
          these instead of stacking — next/head de-dupes by key only. */}
      <title>{title}</title>
      <meta name="description" content={description} key="description" />
      <meta name="keywords" content={keywords} key="keywords" />
      <meta
        name="robots"
        content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        key="robots"
      />

      {/* ── Canonical ─────────────────────────────────────────────── */}
      <link rel="canonical" href={canonical} key="canonical" />

      {/* ── Open Graph ────────────────────────────────────────────── */}
      <meta property="og:type" content="website" key="og:type" />
      <meta property="og:site_name" content={siteName} key="og:site_name" />
      <meta property="og:title" content={title} key="og:title" />
      <meta property="og:description" content={description} key="og:description" />
      <meta property="og:image" content={ogImageAbsolute} key="og:image" />
      <meta property="og:image:width" content="1200" key="og:image:width" />
      <meta property="og:image:height" content="630" key="og:image:height" />
      <meta property="og:image:alt" content={`${siteName} — ${title}`} key="og:image:alt" />
      <meta property="og:url" content={canonical} key="og:url" />
      <meta property="og:locale" content="en_BD" key="og:locale" />

      {/* ── Twitter Card ──────────────────────────────────────────── */}
      <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
      {twitterHandle && <meta name="twitter:site" content={twitterHandle} key="twitter:site" />}
      <meta name="twitter:title" content={title} key="twitter:title" />
      <meta name="twitter:description" content={description} key="twitter:description" />
      <meta name="twitter:image" content={ogImageAbsolute} key="twitter:image" />
      <meta name="twitter:image:alt" content={`${siteName} — ${title}`} key="twitter:image:alt" />

      {/* ── Structured data ───────────────────────────────────────── */}
      <script type="application/ld+json" key="jsonld-organization">{ORG_JSON_LD}</script>
      <script type="application/ld+json" key="jsonld-website">{WEBSITE_JSON_LD}</script>
    </Head>
  );
});
DefaultSEO.displayName = 'DefaultSEO';

// ─── Customer layout ──────────────────────────────────────────────────────────

export const CustomerLayout = memo(({ children }: { children: ReactNode }) => {
  const announcement = useContentStore((s) => s.content.announcement);

  const barVisible =
    announcement?.enabled && announcement?.messages?.some((m: string) => m?.trim());

  return (
    <>
      <DefaultSEO />

      {/* Skip-to-content link — WCAG 2.4.1 bypass block */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:bg-white focus:text-rose-gold focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Announcement bar sits above nav — renders only when active */}
      {barVisible && <AnnouncementBar />}

      <Navbar barVisible={barVisible} />

      <main
        id="main-content"
        role="main"
        tabIndex={-1}
        className={`min-h-screen ${barVisible ? 'pt-[100px] md:pt-[108px]' : 'pt-16 md:pt-[68px]'}`}
      >
        {children}
      </main>

      <Footer />
    </>
  );
});
CustomerLayout.displayName = 'CustomerLayout';
