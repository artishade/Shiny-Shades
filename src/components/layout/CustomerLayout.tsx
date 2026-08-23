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
import { useLoadingStore } from '@/store/useLoadingStore';

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
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="theme-color" content={BRAND.colors.primary} />

      {/* ── Canonical ─────────────────────────────────────────────── */}
      <link rel="canonical" href={canonical} />

      {/* ── Favicons ──────────────────────────────────────────────── */}
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* ── Open Graph ────────────────────────────────────────────── */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImageAbsolute} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${siteName} — ${title}`} />
      <meta property="og:url" content={canonical} />
      <meta property="og:locale" content="en_BD" />

      {/* ── Twitter Card ──────────────────────────────────────────── */}
      <meta name="twitter:card" content="summary_large_image" />
      {twitterHandle && <meta name="twitter:site" content={twitterHandle} />}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageAbsolute} />
      <meta name="twitter:image:alt" content={`${siteName} — ${title}`} />

      {/* ── Verification tags ─────────────────────────────────────── */}
      {settings.googleSearchConsoleVerification && (
        <meta name="google-site-verification" content={settings.googleSearchConsoleVerification} />
      )}
      {settings.bingVerification && <meta name="msvalidate.01" content={settings.bingVerification} />}

      {/* ── Structured data ───────────────────────────────────────── */}
      <script type="application/ld+json">{ORG_JSON_LD}</script>
      <script type="application/ld+json">{WEBSITE_JSON_LD}</script>
    </Head>
  );
});
DefaultSEO.displayName = 'DefaultSEO';

// ─── Customer layout ──────────────────────────────────────────────────────────

export const CustomerLayout = memo(({ children }: { children: ReactNode }) => {
  const announcement = useContentStore((s) => s.content.announcement);
  const isLoading = useLoadingStore((s) => s.isLoading);

  const barVisible =
    announcement?.enabled && announcement?.messages?.some((m: string) => m?.trim());

  // Avoid rendering shell before loading finishes — prevents CLS
  if (isLoading) return <>{children}</>;

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
