import { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';
import { trackingConfig } from '@/config/trackingConfig';

/* ===================================================
   _document.tsx
   Ported from index.html.

   Only truly global, route-independent tags live here:
   charset, viewport, theme-color, favicons, manifest,
   mobile/PWA meta, preconnect/dns-prefetch hints, and the
   GTM / Facebook Pixel init scripts + their <noscript> fallbacks.

   Per-page SEO (title, description, canonical, OG, Twitter,
   Organization/WebSite JSON-LD) is intentionally NOT duplicated
   here — CustomerLayout's <DefaultSEO> and the page-level <SEO>
   component already emit that via next/head on every route.
   =================================================== */

export default function Document() {
  const fbPixelId = trackingConfig.facebookPixelId;
  const gtmId = trackingConfig.gtmId;

  return (
    <Html lang="en-BD">
      <Head>
        {/* ── Verification & default robots (global fallback) ────────── */}
        <meta name="google-site-verification" content="S_qDJr2t5ntRG4FAH_n9NqEUkde824Aea7M7hoVuSFk" />
        <meta name="googlebot" content="index, follow, max-image-preview:large" />
        <meta name="bingbot" content="index, follow" />

        <meta name="author" content="Shiny Shades" />
        <meta name="copyright" content="Shiny Shades" />
        <meta name="language" content="English, Bengali" />

        {/* ── Theme / color scheme ─────────────────────────────────────── */}
        <meta name="theme-color" content="#FAF8F3" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#111111" media="(prefers-color-scheme: dark)" />
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
        <meta name="apple-mobile-web-app-title" content="Shiny Shades" />
        <meta name="application-name" content="Shiny Shades" />
        <meta name="msapplication-TileColor" content="#C9A227" />
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

        {/* ── Facebook Pixel init ──────────────────────────────────────── */}
        <Script id="fb-pixel-init" strategy="afterInteractive">
          {`
            !function (f, b, e, v, n, t, s) {
              if (f.fbq) return;
              n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) };
              if (!f._fbq) f._fbq = n;
              n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
              t = b.createElement(e); t.async = !0; t.src = v;
              s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
            }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${fbPixelId}');
          `}
        </Script>

        {/* ── Google Tag Manager init ──────────────────────────────────── */}
        {gtmId && (
          <Script id="gtm-init" strategy="afterInteractive">
            {`
              (function (w, d, s, l, i) {
                w[l] = w[l] || [];
                w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
                var f = d.getElementsByTagName(s)[0],
                  j = d.createElement(s),
                  dl = l != 'dataLayer' ? '&l=' + l : '';
                j.async = true;
                j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
                f.parentNode.insertBefore(j, f);
              })(window, document, 'script', 'dataLayer', '${gtmId}');
            `}
          </Script>
        )}
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
              <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#C9A227' }}>Shiny Shades</h1>
              <p style={{ color: '#66615B' }}>Please enable JavaScript to use this website.</p>
              <p style={{ marginTop: '0.5rem' }}>
                <a href="https://www.facebook.com/shinyshades/" style={{ color: '#C9A227' }}>
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
