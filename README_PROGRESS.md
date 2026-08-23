# Shiny Shades — Vite → Next.js conversion

Conversion is complete. All customer pages, admin pages, API routes,
and config files have been ported. See git history / chat for details.

## What changed from the Vite version
- `react-router-dom` → `src/lib/routerCompat.tsx` (shim: same hook/Link API, backed by `next/router`)
- `react-helmet-async`'s `<Helmet>` → `next/head`'s `<Head>`
- `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*` (see `.env.example`)
- `import.meta.env.DEV` → `process.env.NODE_ENV !== 'production'`
- Pages split from `src/App.tsx`'s route table into file-based routes under `src/pages/`
- `CouponsInventoryReports.tsx` (3 exports in one file) split into
  `src/components/admin/CouponsInventoryReportsShared.tsx` (implementation)
  plus three thin page files (`admin/coupons.tsx`, `admin/inventory.tsx`, `admin/reports.tsx`)
  since every file directly under `pages/` becomes its own route.
- `index.html` → `src/pages/_document.tsx` (static/global head tags + GTM/FB Pixel init via `next/script`).
  Per-page SEO (title/description/canonical/OG/JSON-LD) intentionally stayed in
  `CustomerLayout`'s `DefaultSEO` + the page-level `SEO` component, not duplicated here.
- `vite.config.ts` → `next.config.js` + `postcss.config.mjs` (Tailwind v4 via `@tailwindcss/postcss`)
  + `tsconfig.json`. Vite's manual chunking/dev-server/optimizeDeps config was dropped —
  Next.js's own per-route bundling replaces it.
- `vercel.json`: `framework` changed to `nextjs`, dropped the Vite `buildCommand`/SPA
  rewrite (Next.js's own router + `npm run build` — which still runs the sitemap
  script first — replace both), kept all security headers, moved the immutable
  cache-control rule to `/_next/static/(.*)`.
- API routes (`src/pages/api/*.js`) needed almost no changes — they already used the
  `(req, res)` Vercel serverless-function convention, which Next.js Pages API routes
  share natively. Fixed one pre-existing bug along the way: `log-order.js` had a typo
  (`sheaders` instead of `headers`) that silently dropped the `Content-Type` header
  on every Google Sheets sync call.

## Before running
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in real values.
3. `npm run dev`

Everything has been syntax-checked with esbuild, but hasn't been run through a real
`next build` yet (no network access to install dependencies in this environment) —
run `npm install && npm run build` locally to catch anything a syntax check can't
(missing packages, type errors, runtime issues).
