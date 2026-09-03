import { Html, Head, Main, NextScript } from 'next/document';
import { trackingConfig } from '@/config/trackingConfig';
import { BRAND, BRAND_THEME_CSS } from '@/config/brandingConfig';

/* ===================================================
   _document.tsx
   Ported from index.html.

   Only truly global, route-independent tags live here:
   charset, viewport, theme-color, favicons, manifest,
   mobile/PWA meta, preconnect/dns-prefetch hints, and the
   brand theme custom properties.

   Per-page SEO (title, description, canonical, OG, Twitter,
   Organization/WebSite JSON-LD) is intentionally NOT duplicated
   here — CustomerLayout's <DefaultSEO> and the page-level <SEO>
   component already emit that via next/head on every route.

   The GTM / Facebook Pixel <Script>s live in _app.tsx: next/script
   only supports beforeInteractive inside _document.
   =================================================== */

export default function Document() {
  const fbPixelId = trackingConfig.facebookPixelId;
  const gtmId = trackingConfig.gtmId;

  return (
    <Html lang="en-BD">
      <Head>
        {/* ── Active brand palette (drives index.css's @theme aliases) ── */}
        <style id="brand-theme" dangerouslySetInnerHTML={{ __html: BRAND_THEME_CSS }} />

        {/* ── Verification & default robots (global fallback) ────────── */}
        {trackingConfig.googleSearchConsoleVerification && (
          <meta name="google-site-verification" content={trackingConfig.googleSearchConsoleVerification} />
        )}
        {trackingConfig.bingVerification && (
          <meta name="msvalidate.01" content={trackingConfig.bingVerification} />
        )}
        <meta name="googlebot" content="index, follow, max-image-preview:large" />
        <meta name="bingbot" content="index, follow" />

        <meta name="author" content={BRAND.fullName} />
        <meta name="copyright" content={BRAND.fullName} />
        <meta name="language" content="English, Bengali" />

        {/* ── Theme / color scheme ─────────────────────────────────────── */}
        <meta name="theme-color" content={BRAND.colors.softBg} media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content={BRAND.colors.charcoal} media="(prefers-color-scheme: dark)" />
        <meta name="color-scheme" content="light" />

        {/* ── Favicons & manifest ──────────────────────────────────────── */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* ── Mobile / PWA meta ────────────────────────────────────────── */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={BRAND.fullName} />
        <meta name="application-name" content={BRAND.fullName} />
        <meta name="msapplication-TileColor" content={BRAND.colors.primary} />
        <meta name="msapplication-config" content="none" />

        {/* ── Preconnect / dns-prefetch ────────────────────────────────── */}
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

        <link rel="preconnect" href="https://connect.facebook.net" crossOrigin="" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://www.facebook.com" />

        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://region1.google-analytics.com" />

        <link rel="dns-prefetch" href="https://supabase.co" />
        <link rel="dns-prefetch" href="https://script.google.com" />
      </Head>
      <body>
        {/* ── GTM / FB Pixel <noscript> fallbacks ──────────────────────── */}
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height={0}
              width={0}
              style={{ display: 'none', visibility: 'hidden' }}
              title="Google Tag Manager"
              aria-hidden="true"
            />
          </noscript>
        )}

        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height={1}
            width={1}
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1`}
            alt=""
            aria-hidden="true"
          />
        </noscript>

        <Main />

        <noscript>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              fontFamily: 'system-ui, sans-serif',
              textAlign: 'center',
              padding: '2rem',
            }}
          >
            <div>
              <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: BRAND.colors.primary }}>
                {BRAND.fullName}
              </h1>
              <p style={{ color: BRAND.colors.warmGray }}>Please enable JavaScript to use this website.</p>
              <p style={{ marginTop: '0.5rem' }}>
                <a href="https://www.facebook.com/shinyshades/" style={{ color: BRAND.colors.primary }}>
                  Visit us on Facebook
                </a>
              </p>
            </div>
          </div>
        </noscript>

        <NextScript />
      </body>
    </Html>
  );
}
