import {
  Component,
  memo,
  useEffect,
  useRef,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/router';
import '@/index.css';

import type { AppPropsWithLayout } from '@/types/layout';
import { useContentStore } from '@/store/contentStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useLoadingStore } from '@/store/useLoadingStore';
import { FullScreenLoader } from '@/components/ui/FullScreenLoader';
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

// ─── Scroll-to-top + route-change loader ──────────────────────────────────────
// Ported from src/App.tsx's <ScrollToTop>.

const ScrollToTop = memo(() => {
  const router = useRouter();
  const setLoading = useLoadingStore((s) => s.setLoading);

  useEffect(() => {
    const handleStart = () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      setLoading(true, 50, 'Preparing View…');
    };
    const handleComplete = () => {
      setLoading(false);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, setLoading]);

  return null;
});
ScrollToTop.displayName = 'ScrollToTop';

// ─── Root boot logic ───────────────────────────────────────────────────────────
// Ported from src/main.tsx's <Root>: fetch content + categories in parallel,
// drive the full-screen loader.

function AppBoot({ children }: { children: ReactNode }) {
  const loadContent = useContentStore((s) => s.loadContent);
  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const setLoading = useLoadingStore((s) => s.setLoading);

  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    let cancelled = false;

    const initApp = async () => {
      setLoading(true, 20, 'Connecting…');

      try {
        await Promise.all([loadContent(), loadCategories()]);
        if (cancelled) return;

        await new Promise<void>((resolve) => setTimeout(resolve, 150));
        if (cancelled) return;

        setLoading(false, 100, 'Ready');
      } catch (error) {
        if (cancelled) return;
        console.error('[AppBoot] initApp failed:', error);
        setLoading(false);
      }
    };

    initApp();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadContent, loadCategories, setLoading]);

  return <>{children}</>;
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page: ReactNode) => page);

  return (
    <ErrorBoundary>
      <AppBoot>
        {/* Global overlays — rendered outside the page tree to avoid re-mounts */}
        <FullScreenLoader />
        <PixelTracker />
        <ScrollToTop />

        {getLayout(<Component {...pageProps} />)}
      </AppBoot>
    </ErrorBoundary>
  );
}
