import {
  StrictMode,
  Component,
  useEffect,
  useRef,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App';
import { useContentStore } from '@/store/contentStore';
import { useCategoryStore } from '@/store/categoryStore';
import { useLoadingStore } from '@/store/useLoadingStore';
import { BRAND, applyBrandTheme } from '@/config/brandingConfig';

// ─── Inject brand theme CSS variables before React mounts ─────────────────────
// This sets --color-rose-gold, --color-blush, etc. on <html> so every
// Tailwind class that uses those variables picks up the correct brand color.
// Change colors in brandingConfig.ts → rebuild → entire site updates.
applyBrandTheme();

// ─── Error Boundary ──────────────────────────────────────────────────────────

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
        // role="alert" + aria-live="assertive": screen readers announce the error immediately
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
          {/*
            h1 here is intentional: this replaces the entire page,
            so it is the document's only top-level heading.
          */}
          <h1
            style={{ fontSize: '2.5rem', color: '#B07D6B', marginBottom: '1rem' }}
          >
            Oops! Something went wrong
          </h1>
          <p
            style={{ fontSize: '1.1rem', color: '#6B5B55', marginBottom: '2rem' }}
          >
            We're sorry for the inconvenience. Please refresh the page or try again
            later.
          </p>
          {/*
            type="button" prevents accidental form submission in edge cases.
            onClick triggers a hard reload to clear the broken render tree.
          */}
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
            // Accessible focus ring so keyboard users can activate it
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

// ─── Root Component ───────────────────────────────────────────────────────────
//
// Responsibilities:
//   1. Boot the app — fetch content + categories in parallel.
//   2. Drive the full-screen loader progress bar.
//   3. Dev-only console branding (stripped from production builds by Vite).
//
// NOT a layout or router component — those live in App.tsx.

function Root() {
  const loadContent = useContentStore((s) => s.loadContent);
  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const setLoading = useLoadingStore((s) => s.setLoading);

  // useRef-based mount guard is StrictMode-safe:
  // In React 18 StrictMode, effects are double-invoked in dev.
  // A closure `let isMounted` would be re-created on the second invoke
  // and would not prevent the double fetch. A ref persists across
  // StrictMode's simulated unmount/remount cycle.
  const hasFired = useRef(false);

  useEffect(() => {
    // Prevent double-fetch from StrictMode double-invoke in dev
    if (hasFired.current) return;
    hasFired.current = true;

    let cancelled = false;

    const initApp = async () => {
      // Step 1 — signal that we're connecting (20 %)
      setLoading(true, 20, 'Connecting…');

      try {
        // Fetch content and categories in parallel — fastest possible boot
        await Promise.all([loadContent(), loadCategories()]);

        if (cancelled) return;

        // Step 2 — brief hold so the loader doesn't flash on fast connections
        // (150 ms is imperceptible on slow connections but removes the jarring
        //  instant-to-100% jump on fast ones)
        await new Promise<void>((resolve) => setTimeout(resolve, 150));

        if (cancelled) return;

        // Step 3 — done
        setLoading(false, 100, 'Ready');
      } catch (error) {
        if (cancelled) return;
        console.error('[Root] initApp failed:', error);
        // Still dismiss the loader so the user isn't stuck on the splash screen
        setLoading(false);
      }
    };

    initApp();

    return () => {
      cancelled = true;
    };
    // loadContent, loadCategories, and setLoading are stable Zustand selectors —
    // their references never change, so this effect runs exactly once.
  }, [loadContent, loadCategories, setLoading]);

  // Dev-only console branding — tree-shaken by esbuild in production builds
  // because import.meta.env.DEV is replaced with `false` at build time.
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(
        `%c🌸 ${BRAND.fullName} %c v1.0.0 `,
        'background: linear-gradient(135deg, #B07D6B 0%, #D4A59A 100%); color: white; padding: 8px 16px; border-radius: 4px 0 0 4px; font-weight: bold; font-size: 14px;',
        'background: #f5f5f5; color: #333; padding: 8px 16px; border-radius: 0 4px 4px 0; font-size: 14px;',
      );
    }
    // Empty dep array: run once on mount, never again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <App />;
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    '[main.tsx] Root element #root not found. Check that index.html contains <div id="root">.',
  );
}

// HelmetProvider is hoisted outside Root so it is mounted exactly once for
// the lifetime of the app. Placing it inside Root would cause it to re-mount
// on every Root re-render, losing Helmet context between renders.
createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <Root />
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// HMR boundary — accepts its own module so hot updates propagate from
// child modules back up to the entry point without a full page reload.
if (import.meta.hot) {
  import.meta.hot.accept();
}
