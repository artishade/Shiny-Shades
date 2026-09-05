import {
  Component,
  memo,
  useEffect,
  useRef,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/router';
import { LazyMotion, domAnimation } from 'framer-motion';
import '@/index.css';

import type { AppPropsWithLayout, PageInitialData } from '@/types/layout';
import { useContentStore } from '@/store/contentStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useProductStore } from '@/store/productStore';
import { trackingConfig } from '@/config/trackingConfig';
import { trackPageView } from '@/lib/facebookPixel';

// ─── Error Boundary ──────────────────────────────────────────────────────────
// Ported verbatim from src/main.tsx.

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('❌ Application Error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #FFF5F7 0%, #FFF0F3 100%)',
          }}
        >
          <h1 style={{ fontSize: '2.5rem', color: '#B07D6B', marginBottom: '1rem' }}>
            Oops! Something went wrong
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#6B5B55', marginBottom: '2rem' }}>
            We&apos;re sorry for the inconvenience. Please refresh the page or try again later.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#FFFFFF',
              background: '#B07D6B',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') window.location.reload();
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Facebook Pixel + GTM page-view tracker ───────────────────────────────────
// Ported from src/App.tsx's <PixelTracker>. useLocation()'s pathname (via the
// router compat shim) is equivalent to react-router's here.

function PixelTracker() {
  const router = useRouter();
  const pathname = router.pathname.startsWith('/admin') ? router.pathname : router.asPath.split('?')[0];

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;

    trackPageView();

    if (trackingConfig.gtmId) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'page_view', page_path: pathname });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}

// ─── Scroll-to-top on navigation ──────────────────────────────────────────────
// Ported from src/App.tsx's <ScrollToTop>.

const ScrollToTop = memo(() => {
  const router = useRouter();

  useEffect(() => {
    const handleStart = () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    };

    router.events.on('routeChangeStart', handleStart);

    return () => {
      router.events.off('routeChangeStart', handleStart);
    };
  }, [router]);

  return null;
});
ScrollToTop.displayName = 'ScrollToTop';

// ─── ISR store hydration ──────────────────────────────────────────────────────

let clientHydrated = false;

/**
 * Seeds the stores from a page's getStaticProps data on the client, once.
 *
 * Runs in an effect, never during render: some components read live state
 * through getters kept in the store (Navbar's `getSiteSettings()`), which
 * bypasses the SSR snapshot entirely, so any write before hydration commits
 * shows up in the hydration render and mismatches the HTML.
 *
 * Server renders don't need it — zustand v5 always hands useSyncExternalStore
 * `getInitialState()` as the server snapshot, so prerendered components read the
 * ISR props directly (see usePrerenderedContent). This exists so that after
 * hydration the stores already hold the real data, letting the shell — navbar
 * logo, categories, announcement bar — fill in without waiting for a fetch.
 */
function hydrateStores({ initialContent, initialCategories, initialProducts }: PageInitialData) {
  if (clientHydrated) return;
  clientHydrated = true;

  if (initialContent) {
    useContentStore.setState({ content: initialContent, hasFetched: true });
  }

  if (initialCategories?.length) {
    useCategoryStore.setState({ categories: initialCategories, hasFetched: true });
  }

  // cacheTimestamp stays null so fetchProducts still pulls fresh rows — stock and
  // prices must not sit on an ISR snapshot for a whole revalidate window.
  if (initialProducts?.length) {
    useProductStore.setState({ products: initialProducts, hasFetched: true });
  }
}

// ─── Root boot logic ───────────────────────────────────────────────────────────
// Ported from src/main.tsx's <Root>: fetch content + categories in parallel.

function AppBoot({ pageProps, children }: { pageProps: PageInitialData; children: ReactNode }) {
  const loadContent = useContentStore((s) => s.loadContent);
  const loadCategories = useCategoryStore((s) => s.loadCategories);

  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    // Seed from the ISR payload first — loadContent/loadCategories then no-op.
    hydrateStores(pageProps);

    Promise.all([loadContent(), loadCategories()]).catch((error) => {
      console.error('[AppBoot] initApp failed:', error);
    });
  }, [loadContent, loadCategories, pageProps]);

  return <>{children}</>;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page: ReactNode) => page);

  return (
    <ErrorBoundary>
      {/* Every animated component imports `m as motion`, not `motion` — the full
          `motion` component statically pulls in every feature, which was a 43 kB
          gzip chunk on all 28 routes. `strict` makes a stray `motion.` throw
          instead of silently restoring that chunk. */}
      <LazyMotion features={domAnimation} strict>
        <AppBoot pageProps={pageProps as PageInitialData}>
          {/* Global side-effects — rendered outside the page tree to avoid re-mounts */}
          <PixelTracker />
          <ScrollToTop />

          {getLayout(<Component {...pageProps} />)}
        </AppBoot>
      </LazyMotion>
    </ErrorBoundary>
  );
}
