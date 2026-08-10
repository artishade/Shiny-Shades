import React, { useEffect, useCallback, lazy, Suspense, memo } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { SITE, siteConfig } from '@/config/siteConfig';
import { BRAND, brandingConfig } from '@/config/brandingConfig';
import { trackingConfig } from '@/config/trackingConfig';

// Layout
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { useContentStore } from '@/store/contentStore';
import { useAdminAuthStore } from '@/store';
import { useLoadingStore } from '@/store/useLoadingStore';
import { FullScreenLoader } from '@/components/ui/FullScreenLoader';
import { supabase } from '@/lib/supabase';

// Customer pages — eagerly loaded (critical for FCP / LCP)
import { HomePage } from '@/pages/Home';
import { ShopPage } from '@/pages/Shop';
import { NewArrivalsPage } from '@/pages/NewArrivals';
import { SalePage } from '@/pages/Sale';
import { ProductDetailPage } from '@/pages/ProductDetail';
import { CartPage } from '@/pages/Cart';
import { CheckoutPage } from '@/pages/Checkout';
import { SearchPage } from '@/pages/Search';
import { CategoryPage } from '@/pages/CategoryPage';
import { NotFoundPage } from '@/pages/NotFound';
import { ContactUsPage } from '@/pages/ContactUs';
import { AboutUsPage } from '@/pages/AboutUs';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicy';
import { ReturnPolicyPage } from '@/pages/ReturnPolicy';
import { TermsPage } from '@/pages/Terms';
import { PaymentSuccessPage } from '@/pages/PaymentSuccess';
import { PaymentCancelPage } from '@/pages/PaymentCancel';

// Admin login — eager (small, often hit directly via URL)
import { AdminLoginPage } from '@/pages/admin/AdminLogin';

// Admin pages — lazy (shoppers never download these; split into separate chunks)
const AdminDashboard = lazy(() =>
  import('@/pages/admin/Dashboard').then((m) => ({ default: m.AdminDashboard })),
);
const AdminProducts = lazy(() =>
  import('@/pages/admin/Products').then((m) => ({ default: m.AdminProducts })),
);
const AdminCategories = lazy(() =>
  import('@/pages/admin/Categories').then((m) => ({ default: m.AdminCategories })),
);
const AdminOrders = lazy(() =>
  import('@/pages/admin/Orders').then((m) => ({ default: m.AdminOrders })),
);
const AdminCustomers = lazy(() =>
  import('@/pages/admin/Customers').then((m) => ({ default: m.AdminCustomers })),
);
const AdminContent = lazy(() =>
  import('@/pages/admin/Content').then((m) => ({ default: m.AdminContent })),
);

// All three exports from the same chunk — import once, tree-shake per route
const CouponsInventoryReportsChunk = () =>
  import('@/pages/admin/CouponsInventoryReports');

const AdminCoupons = lazy(() =>
  CouponsInventoryReportsChunk().then((m) => ({ default: m.AdminCoupons })),
);
const AdminInventory = lazy(() =>
  CouponsInventoryReportsChunk().then((m) => ({ default: m.AdminInventory })),
);
const AdminReports = lazy(() =>
  CouponsInventoryReportsChunk().then((m) => ({ default: m.AdminReports })),
);

import { trackPageView } from '@/lib/facebookPixel';

// ─── Canonical origin (strip trailing slash once) ────────────────────────────

const ORIGIN = SITE.domain.replace(/\/$/, '');

// ─── Org JSON-LD (stable — defined outside render) ───────────────────────────

const ORG_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BRAND.fullName,
  url: ORIGIN,
  logo: `${ORIGIN}${brandingConfig.logoUrl}`,
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

// ─── Admin lazy-load fallback ─────────────────────────────────────────────────

const AdminFallback = memo(() => (
  <div
    role="status"
    aria-live="polite"
    aria-label="Loading admin panel"
    className="flex items-center justify-center min-h-[60vh]"
  >
    <p className="text-[#6B5B55] text-sm animate-pulse">Loading…</p>
  </div>
));
AdminFallback.displayName = 'AdminFallback';

// ─── Facebook Pixel + GTM page-view tracker ───────────────────────────────────

function PixelTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;

    // Facebook Pixel
    trackPageView();

    // GTM virtual page view (dataLayer push)
    if (trackingConfig.gtmId) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'page_view', page_path: pathname });
    }
  }, [pathname]);

  return null;
}

// ─── Scroll-to-top + route-change loader ──────────────────────────────────────

const ScrollToTop = memo(() => {
  const { pathname, search } = useLocation();
  const setLoading = useLoadingStore((s) => s.setLoading);

  useEffect(() => {
    // instant: avoids janky animation that worsens CLS on route change
    window.scrollTo({ top: 0, behavior: 'instant' });
    setLoading(true, 50, 'Preparing View…');
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [pathname, search, setLoading]);

  return null;
});
ScrollToTop.displayName = 'ScrollToTop';

// ─── Default SEO — site-wide fallback for every page ─────────────────────────
// Uses live siteSettings from Supabase if available; falls back to siteConfig.ts.

const DefaultSEO = memo(() => {
  const { pathname } = useLocation();
  const settings = useContentStore((s) => s.content.siteSettings);

  const siteName = settings.siteName || siteConfig.websiteName;
  const title = settings.defaultTitle || siteConfig.defaultTitle;
  const description = settings.defaultDescription || siteConfig.defaultDescription;
  const keywords = (settings.keywords?.length ? settings.keywords : siteConfig.keywords).join(', ');
  const ogImage = settings.ogImage || siteConfig.ogImage;
  const twitterHandle = settings.twitterHandle || '';

  // Canonical: always absolute, strip query strings on root
  const canonical = `${ORIGIN}${pathname === '/' ? '' : pathname}`;

  // OG image: make absolute if relative path
  const ogImageAbsolute = ogImage.startsWith('http') ? ogImage : `${ORIGIN}${ogImage}`;

  return (
    <Helmet>
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
        <meta
          name="google-site-verification"
          content={settings.googleSearchConsoleVerification}
        />
      )}
      {settings.bingVerification && (
        <meta name="msvalidate.01" content={settings.bingVerification} />
      )}

      {/* ── Structured data ───────────────────────────────────────── */}
      <script type="application/ld+json">{ORG_JSON_LD}</script>
      <script type="application/ld+json">{WEBSITE_JSON_LD}</script>
    </Helmet>
  );
});
DefaultSEO.displayName = 'DefaultSEO';

// ─── Customer layout ──────────────────────────────────────────────────────────

const CustomerLayout = memo(() => {
  const announcement = useContentStore((s) => s.content.announcement);
  const isLoading = useLoadingStore((s) => s.isLoading);

  const barVisible =
    announcement?.enabled &&
    announcement?.messages?.some((m: string) => m?.trim());

  // Avoid rendering shell before loading finishes — prevents CLS
  if (isLoading) return <Outlet />;

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

      {/*
        min-h-screen prevents CLS from content-less shells.
        Padding-top must always reserve the Navbar's own height
        (h-16 / md:h-[68px]) since it's `fixed`, plus the
        AnnouncementBar's height (h-9 / md:h-10) when visible.
      */}
      <main
        id="main-content"
        role="main"
        tabIndex={-1}
        className={`min-h-screen ${
          barVisible
            ? 'pt-[100px] md:pt-[108px]'
            : 'pt-16 md:pt-[68px]'
        }`}
      >
        <Outlet />
      </main>

      <Footer />
    </>
  );
});
CustomerLayout.displayName = 'CustomerLayout';

// ─── Admin protected route — validates live Supabase session ─────────────────

const AdminProtectedRoute = memo(() => {
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);
  const setAuthenticated = useAdminAuthStore((s) => s.setAuthenticated);
  const [checking, setChecking] = React.useState(true);

  // Stable callback reference — avoids re-triggering useEffect on re-renders
  const checkSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setAuthenticated(!!data.session);
    setChecking(false);
  }, [setAuthenticated]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (checking) return <AdminFallback />;
  if (!isAuthenticated) return <Navigate to="/admin" replace />;
  return <Outlet />;
});
AdminProtectedRoute.displayName = 'AdminProtectedRoute';

// ─── Shared Suspense wrapper for admin routes ─────────────────────────────────

const withAdminSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<AdminFallback />}>
    <Component />
  </Suspense>
);

// ─── App ──────────────────────────────────────────────────────────────────────

const App: React.FC = () => (
  <BrowserRouter>
    {/* Global overlays — rendered outside route tree to avoid re-mounts */}
    <FullScreenLoader />
    <PixelTracker />
    <ScrollToTop />

    <Routes>
      {/* ── Customer routes ─────────────────────────────────────── */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/new-arrivals" element={<NewArrivalsPage />} />
        <Route path="/sale" element={<SalePage />} />
        <Route path="/product/:slug" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/about" element={<AboutUsPage />} />
        <Route path="/contact" element={<ContactUsPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/return-policy" element={<ReturnPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/payment/cancel" element={<PaymentCancelPage />} />
        <Route path="/404" element={<NotFoundPage />} />
      </Route>

      {/* ── Admin login (public) ────────────────────────────────── */}
      <Route path="/admin" element={<AdminLoginPage />} />

      {/* ── Admin protected routes ──────────────────────────────── */}
      <Route element={<AdminProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={withAdminSuspense(AdminDashboard)} />
          <Route path="/admin/products" element={withAdminSuspense(AdminProducts)} />
          <Route path="/admin/categories" element={withAdminSuspense(AdminCategories)} />
          <Route path="/admin/orders" element={withAdminSuspense(AdminOrders)} />
          <Route path="/admin/customers" element={withAdminSuspense(AdminCustomers)} />
          <Route path="/admin/content" element={withAdminSuspense(AdminContent)} />
          <Route path="/admin/coupons" element={withAdminSuspense(AdminCoupons)} />
          <Route path="/admin/inventory" element={withAdminSuspense(AdminInventory)} />
          <Route path="/admin/reports" element={withAdminSuspense(AdminReports)} />
        </Route>
      </Route>

      {/* ── 404 catch-all ───────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;