# Shiny Shades — Project Context

## Overview

Shiny Shades is an e-commerce storefront for a Bangladesh-based women's fashion boutique, selling western dresses, traditional wear, jewelry, and cosmetics with BDT pricing, bKash/Nagad/SSLCommerz/COD payments, and a Supabase-backed admin panel. The codebase is a recent Next.js 15 (Pages Router, Turbopack) port of an earlier Vite + react-router-dom SPA; the conversion is functionally complete and the app runs as a Vercel-hosted Next.js project with a Supabase backend.

## Tech Stack

- **Framework**: Next.js 15.1 (Pages Router, Turbopack dev), React 19.2, TypeScript 5.9 strict mode.
- **Styling**: Tailwind CSS 4.1 (via `@tailwindcss/postcss`), `clsx` + `tailwind-merge` (`cn` helper in `src/utils/cn.ts`); brand colors injected as CSS variables on `<html>` from `brandingConfig.ts`.
- **State**: Zustand 5 with `persist` middleware for client-only state. Stores split into "persisted" (cart, auth, UI prefs) and "Supabase-backed" (products, categories, orders, content) per the rules in `src/store/index.ts`.
- **Backend / DB**: Supabase (Postgres + Auth + RLS + RPC). Service-role key is server-only; anon key is public. Schema lives in `supabase/schema.sql`; incremental migrations in `supabase/migrations/`.
- **Media**: Cloudinary (client-side uploads via signed upload preset, browser-side compression via `browser-image-compression`).
- **Payments**:
  - SSLCommerz — direct REST (no SDK), bKash/Nagad flows. Init endpoint + callback endpoint.
  - bKash/Nagad manual send-money flow with placeholder merchant number.
  - Cash on Delivery (COD).
- **Analytics / tracking**: Google Tag Manager, Facebook Pixel, `@vercel/analytics`. Config in `src/config/trackingConfig.ts` with hardcoded fallback IDs.
- **Tooling**: ESLint 9 (`eslint-config-next`), `dotenv`, sitemap generator script.
- **Hosting / deploy**: Vercel (`vercel.json` declares `framework: "nextjs"`, security headers, immutable caching for `/_next/static/*`).

## Structure

```
src/
├── pages/                # Next.js file-based routes (Pages Router)
│   ├── _app.tsx          # ErrorBoundary, AppBoot (loads content+categories), PixelTracker, ScrollToTop
│   ├── _document.tsx     # Global <head>: favicons, GTM+FB Pixel init, preconnects, <noscript> fallbacks
│   ├── index.tsx         # Landing page (Hero, banners, featured, trending, new arrivals)
│   ├── shop.tsx, search.tsx, categories.tsx
│   ├── product/[slug].tsx        # PDP
│   ├── category/[slug].tsx       # PLP
│   ├── cart.tsx, checkout.tsx    # Cart + checkout (COD/bKash/Nagad/SSLCommerz)
│   ├── payment/{success,cancel}.tsx
│   ├── about.tsx, contact.tsx, terms.tsx, privacy-policy.tsx, return-policy.tsx, 404.tsx
│   ├── admin/                    # Admin panel: dashboard, products, categories, orders, customers, coupons, inventory, reports, content, login (index.tsx)
│   └── api/                      # Vercel serverless functions
│       ├── sslcommerz-init.js, sslcommerz-callback.js
│       ├── log-order.js          # Forwards order payload to Google Sheets webhook
│       └── _lib/rateLimit.js     # Shared Supabase-backed rate-limit RPC
│
├── components/
│   ├── layout/           # CustomerLayout (DefaultSEO + Navbar/Footer/AnnouncementBar), AdminLayout, AdminAuthLayout
│   ├── home/             # Hero, BannerSlider, CategoryShowcase, FeaturedCollection, TrendingProducts, NewArrivals, ProductCard
│   ├── shop/             # ProductFilter, ShopCategoryMarquee
│   ├── admin/            # ImageCropperModal, OrderPdfModal, PdfSettingsPanel, CouponsInventoryReportsShared
│   ├── ui/               # Shared UI primitives (Button, FadeIn, SectionHeader, PriceDisplay, FullScreenLoader)
│   └── SEO.tsx           # Per-page <Head> wrapper
│
├── store/                # Zustand stores (see Architecture)
├── config/               # brandingConfig (BRAND + THEMES), siteConfig (SITE + SEO keywords), contactConfig, trackingConfig
├── lib/                  # supabase.ts (client + helpers), cloudinary.ts, colorUtils.ts, facebookPixel.ts, gtm.ts,
│                         # heroLayout.ts, orderPdf.ts (jsPDF + autotable), routerCompat.tsx (react-router-shaped shim)
├── data/mockData.ts      # Mock fallback data (coupons, etc.) — used by adminDataStore for coupons only
├── types/                # Shared TypeScript types (Product, Category, CartItem, Order, etc.) + AppPropsWithLayout
├── utils/cn.ts           # clsx + tailwind-merge wrapper
└── index.css             # Tailwind v4 entry + custom layer

supabase/
├── schema.sql            # Full schema: tables, RLS policies, is_admin() SECURITY DEFINER fn, views, seed data
└── migrations/           # 002_payment_gateways, 003_product_seo, 004_category_subcategories

scripts/
├── generate-sitemap.mjs  # Runs at build: fetches active products+categories from Supabase, writes public/sitemap.xml
└── test-cloudinary.mjs   # Manual Cloudinary connectivity check

public/                   # Favicons, manifest, robots.txt, generated sitemap.xml
```

## Architecture / Data Flow

**Customer flow:**
`Browser → Next.js page → CustomerLayout (DefaultSEO + Navbar + Footer) → page component → useXStore (Zustand) → supabase.from(...)`.

- `CustomerLayout` wraps every customer page and renders `DefaultSEO` (default title/description/canonical/OG/Twitter from `siteConfig`).
- Per-page SEO overrides happen via the `SEO` component or inline `<Head>` blocks in pages like `index.tsx`, `product/[slug].tsx`.
- Dynamic routes read params via `useParams()` from `src/lib/routerCompat.tsx` (a thin `next/router`-backed shim shaped like react-router-dom — kept so post-migration imports keep working).

**State stores** (`src/store/index.ts` defines import rules):
- Persisted (localStorage): `useCartStore`, `useAdminAuthStore`, `useCouponStore`, `useRecentlyViewedStore`, `useUIStore`.
- Supabase-backed (no persistence, Supabase is source of truth): `useProductStore`, `useCategoryStore`, `useOrderStore`, `useContentStore`.
- Stores never import each other to avoid circular deps. `useCartStore` reads coupons via `useCouponStore.getState()` (one-way read).

**Admin flow:**
`Browser → /admin/* → AdminAuthLayout → AdminLayout → admin page component`. Admin auth uses Supabase Auth (`signInWithPassword`) — `useAdminAuthStore.setAuthenticated(true)` flips a local flag. Server-side authorization is enforced in Supabase via the `is_admin()` SQL function (`SECURITY DEFINER`, checks `auth.jwt() ->> 'email'` against the `admins` table) and RLS policies.

**Checkout / payments flow:**
1. `checkout.tsx` builds order payload and calls `supabase.from('orders').insert(...)` with `payment_status: 'pending'`.
2. Client also calls `POST /api/log-order` which forwards the order to `GOOGLE_SHEET_URL` if configured (never breaks checkout on failure).
3. For online payments, client then calls `POST /api/sslcommerz-init` (gets GatewayPageURL).
4. After payment, customer is redirected to `/payment/success` or `/payment/cancel` (UI-only — never trusted as proof of payment).
5. **Trustworthy signal**: SSLCommerz hits `POST /api/sslcommerz-callback` server-to-server and that is what updates Supabase.

**Build-time flow:**
`npm run build` → `scripts/generate-sitemap.mjs` (uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to fetch active products/categories) → writes `public/sitemap.xml` → `next build` runs.

## Conventions

- **Path alias**: `@/*` → `src/*` (see `tsconfig.json`).
- **Routing**: Pages Router (not App Router). Every file directly under `src/pages/` is a route. The `routerCompat.tsx` shim preserves the `react-router-dom` API surface (`useNavigate`, `useParams`, `useLocation`, `useSearchParams`, `<Link to>`) so legacy imports work.
- **State**: Zustand everywhere. Persisted vs Supabase-backed split is strict and documented at the top of `store/index.ts`. `mockData.ts` is only used as fallback for `adminDataStore` coupons.
- **Env vars**: `NEXT_PUBLIC_*` is inlined into the browser bundle (same role as old `VITE_*`); everything else is server-only. See `.env.example` for the canonical list.
- **Brand / theme**: `src/config/brandingConfig.ts` is THE single source of truth for store name, logo, theme colors, order prefix, watermark text, OG image. Theme is set via `ACTIVE_THEME` constant — colors are injected as CSS custom properties on `<html>` and consumed by Tailwind utility classes (e.g. `text-rose-gold`, `bg-blush-light`).
- **Currency**: BDT (`৳`), symbol/code in `SITE.currency`. All prices in taka; SSLCommerz is initialised with `currency: 'BDT'`.
- **Code style**: TypeScript strict, no comments unless explaining "why" (the existing codebase has heavy doc-comments at the top of each major file — that's the established pattern). ESLint 9 flat config in `eslint.config.mjs`, run via `npm run lint` (`eslint .`).
- **API routes**: Plain `.js` (not `.ts`) — Vercel serverless convention, uses `(req, res)` handler. Returns `res.status(...).json(...)`.
- **SEO**: Per-page via `<SEO>` component or inline `next/head`. `CustomerLayout`'s `DefaultSEO` provides site-wide defaults (title, description, canonical, OG, Twitter, Organization/WebSite JSON-LD). `_document.tsx` holds only truly global tags (favicons, GTM, FB Pixel init, preconnects).
- **Tracking events**: Emitted via `trackXxx` helpers in `src/lib/facebookPixel.ts` and via `window.dataLayer.push({ event: '...', ecommerce: {...} })` for GTM. Page-view tracking is in `_app.tsx`'s `PixelTracker` (skips `/admin/*`).
- **Images**: Plain `<img>` tags pointed at Cloudinary (no `next/image`), with helpers `getOptimizedImageUrl` / `getResponsiveSrcSet` in `src/lib/cloudinary.ts`.

## Setup & Commands

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev                  # next dev --turbopack (http://localhost:3000)
npm run lint                 # next lint
npm run build                # build:sitemap → generate-sitemap.mjs → next build
npm start                    # next start (production)
```

**Required env vars** (see `.env.example` for full list):
- Client: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`, `NEXT_PUBLIC_FB_PIXEL_ID`, `NEXT_PUBLIC_GTM_ID`.
- Server only: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`, `SSLCOMMERZ_IS_SANDBOX`, `PUBLIC_SITE_URL`, `GOOGLE_SHEET_URL` (optional).

**Supabase setup**: Run `supabase/schema.sql` in Supabase SQL Editor (creates tables, RLS, `is_admin()` function, views, seed data). Apply `supabase/migrations/*.sql` for incremental additions. Create admin users via Supabase Auth and add matching emails to the `admins` table.

**Deploy**: Push to a Vercel project with the env vars set in Project Settings. `vercel.json` already configures framework + security headers + immutable caching for `/_next/static/*`. After deploy, point the SSLCommerz store's callback URLs at `https://<domain>/api/sslcommerz-callback`.

## Known Issues / TODOs

- **`checkout.tsx:46`** — `MOBILE_BANKING_MERCHANT_NUMBER = '01700000000'` is a placeholder; TODO says to replace with real bKash/Nagad merchant numbers. bKash/Nagad flows currently send customers to send money manually with this fake number.
- **`adminDataStore.ts`** — Coupons are persisted in localStorage via `persist` (using mock data as seed), even though the `coupons` table exists in Supabase and `useCouponStore` reads from it. There are two parallel coupon implementations (`useCouponStore` from `couponStore.ts` and `useAdminDataStore.coupons`); cart's `applyCoupon` uses `useCouponStore`. The admin Coupons page wires `useAdminDataStore` (see `CouponsInventoryReportsShared.tsx`), so admin-edited coupons in localStorage don't necessarily reach the cart's coupon source of truth.
- **`README_PROGRESS.md`** — Author's note: conversion has been syntax-checked but not run through a real `next build` in the migration environment. First local `npm install && npm run build` may surface missing deps or type errors.
- **`mockData.ts`** — Still referenced by `adminDataStore` for coupons. If you wire coupons fully to Supabase, this file's role can be reduced.
- **RTL/bilingual** — Bengali strings are present in checkout validation, bKash/Nagad labels, thana names. Most UI is English-only; full i18n isn't implemented.
- **Image upload UX** — Admin product image uploads use `browser-image-compression` + a signed Cloudinary upload preset (client-side). No server-side moderation/size limits beyond what the preset enforces.
- **Rate limiter** — `src/pages/api/_lib/rateLimit.js` calls a Supabase RPC `check_rate_limit` that isn't defined in `schema.sql`. Fail-open behavior means requests still go through if the RPC is missing, but the function should be added to the DB if rate limiting is intended to actually work.
- **`/payment/success` and `/payment/cancel`** — These pages only look up the order by number for display; payment verification happens in the webhook/callback. Do not add trust-sensitive logic to these routes.
- **Hardcoded tracking IDs** — `src/config/trackingConfig.ts` has hardcoded fallback IDs when env vars are unset; in production these should always be set explicitly.
