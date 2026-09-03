applyBrandTheme() কখনো call হয় না → theme switch dead

ACTIVE_THEME = 'Luxury Gold' set করা, কিন্তু applyBrandTheme কোথাও import হয়নি। ফাংশনের নিজের comment বলছে "the real application happens client-side via the inline blocking script in _document.tsx (see getInitialProps there)" — _document.tsx-এ ঐ script বা getInitialPropsকিছুই নেই। আর index.css-এর @theme block-এ Rose Gold-এর hex hardcoded। মানে theme পাল্টালে text-rose-gold/bg-blush-light ক্লাসগুলো পুরনো রংই দেখাবে। Migration-এ main.tsx-এর call site হারিয়ে গেছে।

প্রতিটা customer page-এর SSR HTML-এ Navbar/Footer/SEO নেই

useLoadingStore initial isLoading: true, আর CustomerLayout:

----tsx-----
if (isLoading) return <>{children}</>;

Server-এ store সবসময় initial state, তাই server-rendered HTML-এ <DefaultSEO>, Navbar, Footer, skip-link — কিছুই নেই। crawler প্রথমে nav-less, canonical-less, OG-less page পায়। SSR faild
একই কারণে প্রতিটা navigation-এ Navbar/Footer unmount

_app.tsx-এর ScrollToToprouteChangeStart-এ setLoading(true) করে, তাই route change-এ CustomerLayout খালি children return করে → Navbar/Footer destroy → complete হলে আবার mount। প্রতি click-এ layout remount + flash + CLS।

Nested <main> + duplicate id="main-content"

CustomerLayout এ <main id="main-content">, আর pages/index.tsx:452-এ আবার <main id="main-content"> ভেতরে। Invalid HTML, duplicate ID, দুইটা main landmark — skip-link ভাঙে। WCAG issue।


SEO.tsx-এ placeholder default

----ts-----
const DEFAULTS = { siteName: "My Site", themeColor: "#ffffff", ... }

about, contact, terms, privacy-policy, return-policy, payment/ — কোনো page siteName pass করে না, তাই ঐ সব page-এ og:site_name = "My Site"।

. site.webmanifest rebrand করা হয়নি

"name": "MyWebSite", "short_name": "MySite", theme_color: "#ffffff"। আর দুইটা icon-ই শুধু "purpose": "maskable" — একটা "any" purpose icon ছাড়া Android install prompt-এ icon ভুল আসে।

/images/logo.png file-টাই নেই

BRAND.logoUrl = '/images/logo.png', public/-এ images/ ফোল্ডার নেই। ব্যবহার হচ্ছে Organization JSON-LD-র logo field-এ আর orderPdf.ts-এ → broken structured data + PDF logo।

_document.tsx + DefaultSEO — duplicate meta/link

theme-color, favicon (svg/png/ico), apple-touch-icon, manifest — দুই জায়গাতেই। প্রতি page-এ duplicate tag। একটা জায়গায় রাখো (_document)।

next/script afterInteractive _document-এর ভেতরে

Next-এর নিয়ম: _document-এ শুধু beforeInteractive allowed, বাকি strategy _app-এ। FB Pixel + GTM init দুইটাই afterInteractive দিয়ে _document.tsx-এর <Head>-এ — behaviour unreliable/warned। Pixel-এর ক্ষেত্রে এটা silent tracking loss হতে পারে।

cart.tsx-এ duplicate view_cart event, একটা অসম্পূর্ণ

দুইটা useEffect আছে। প্রথমটায় (line 35-51):

----ts-----
window.dataLayer.push({ event: 'view_cart', /* ...unchanged */ });

— ecommerce payload ছাড়া। দ্বিতীয়টায় (line 54+) পুরো payload। GA4-তে duplicate + একটা junk event।

checkout.tsx render-এর ভেতরে navigate

line 571-574:

----tsx-----
if (checkoutItems.length === 0 && !orderPlaced) {
navigate('/cart');
return null;
}

Render body-তে router side-effect। React 19 + strict mode-এ double-invoke, duplicate push। useEffect-এ সরাও।

Buy Now flow-র checkout side dead code

routerCompat.useLocation() সবসময় state: null return করে (react-router-এর state Next-এ নেই)। checkout.tsx-এর buyNow = location.state as BuyNowState তাই কখনোই set হয় না। BuyNowState interface, checkoutItems branch, if (!buyNow) clearCart() — সব dead। PDP-র handleBuyNow cart-এ add করে navigate করে, তাই user-facing flow ভাঙেনি, কিন্তু ~40 লাইন misleading code।

admin guard localStorage-এ persist করা

adminAuthStore-এ isAuthenticatedpersist দিয়ে website-admin key-তে। DevTools-এ true বসিয়ে দিলে admin UI shell খুলে যাবে (data RLS-এ আটকাবে, তাই leak নেই — কিন্তু guard কার্যত cosmetic)। AdminAuthLayoutonAuthStateChange subscribe করে না, token expire হলেও UI চালু থাকে।

জোড়া/orphan implementation

• lib/cloudinary.ts-এর getOptimizedImageUrlআরproduct/slugtsx:75-এ একটা লোকাল same-নামের ফাংশন (আলাদা behaviour: dpr_auto আছে, c নেই)।
• scripts/test-cloudinary.mjs একটা তৃতীয় implementation (parseTransformParams, cloudinaryLoader) test করে যা src-এ নেই। test pass করবে, কিন্তু কিছুই verify করে না।
• lib/supabase.ts-এর createOrder() (unused) + orderStore.placeOrder() — দুইটা order path, প্রথমটা নিজেই sendOrderToGoogleSheets call করে, তাই কখনো ব্যবহার করলে double Sheets entry।
Vite-যুগের leftover comment (কোড ঠিক, comment মিথ্যা)

File সমস্যা
config/trackingConfig.ts ৩ জায়গায় VITE_FB_PIXEL_ID / VITE_GTM_ID + "index.html reads the SAME env var via Vite's %VITE_% substitution" — কোড NEXT_PUBLIC পড়ে
lib/gtm.ts "loaded via the GTM snippet in index.html"
lib/facebookPixel.ts initFacebookPixel() — খালি ফাংশন, "Already initialized in index.html", কেউ call করে না

Sitemap অসম্পূর্ণ

generate-sitemap.mjs শুধু /, /shop, /search + product + category দেয়। /categories, /about, /contact, /terms, /privacy-policy, /return-policy বাদ। committed public/sitemap.xml-এ মাত্র ৩টা URL।
_document.tsx-এ hardcoded verification token

google-site-verification inline hardcoded, অথচ trackingConfig.googleSearchConsoleVerification ('') এবং contentStore.siteSettings.googleSearchConsoleVerification — একই জিনিসের ৩টা source, দুইটা unused।
