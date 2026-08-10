import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // ─── Plugins ───────────────────────────────────────────────────────────────
  plugins: [
    react({
      // Babel fast-refresh only in dev; production stays pure esbuild
      babel: {
        plugins: [],
      },
    }),
    tailwindcss(),
    // Automatically splits node_modules into a shared vendor chunk.
    // Works alongside the manual chunking below — complementary, not redundant.
    // Vite's default behavior is to put all node_modules into a single chunk,
  ],

  // ─── Path aliases ──────────────────────────────────────────────────────────
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  // ─── Build ─────────────────────────────────────────────────────────────────
  build: {
    // Target modern browsers only — Bangladesh mobile market is Chrome-heavy.
    // Avoids legacy polyfill bloat; aligns with your browserslist config.
    target: ["es2020", "chrome80", "firefox78", "safari14"],

    // Raise the warning threshold slightly — Framer Motion is legitimately large.
    // Below 600 kB per chunk is still healthy with code splitting in place.
    chunkSizeWarningLimit: 600,

    // Use lightningcss for CSS minification (already in your package.json)
    cssMinify: "lightningcss",

    rollupOptions: {
      output: {
        // ── Manual chunk splitting ────────────────────────────────────────────
        // Each chunk gets a stable name → long-term browser cache.
        // When only your app code changes, vendors stay cached.
        manualChunks: (id) => {
          // ── React core — changes almost never ────────────────────────────────
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor-react";
          }

          // ── React Router — changes rarely ────────────────────────────────────
          if (id.includes("node_modules/react-router")) {
            return "vendor-router";
          }

          // ── Framer Motion — large, changes rarely ────────────────────────────
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-motion";
          }

          // ── Supabase — heavy SDK, changes rarely ─────────────────────────────
          if (id.includes("node_modules/@supabase")) {
            return "vendor-supabase";
          }

          // ── Cloudinary — image SDK, changes rarely ───────────────────────────
          if (
            id.includes("node_modules/@cloudinary") ||
            id.includes("node_modules/cloudinary-core")
          ) {
            return "vendor-cloudinary";
          }

          // ── Zustand — tiny but stable ─────────────────────────────────────────
          if (id.includes("node_modules/zustand")) {
            return "vendor-zustand";
          }

          // ── Lucide icons — can be large, isolate for cache stability ─────────
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }

          // ── react-helmet-async — small, rarely changes ───────────────────────
          if (id.includes("node_modules/react-helmet-async")) {
            return "vendor-helmet";
          }

          // ── Utility libs — clsx, tailwind-merge, nanoid, cookie ──────────────
          if (
            id.includes("node_modules/clsx") ||
            id.includes("node_modules/tailwind-merge") ||
            id.includes("node_modules/nanoid") ||
            id.includes("node_modules/cookie")
          ) {
            return "vendor-utils";
          }

          // ── Color utilities — color-name-list + nearest-color ─────────────────
          if (
            id.includes("node_modules/color-name-list") ||
            id.includes("node_modules/nearest-color")
          ) {
            return "vendor-color";
          }

          // ── Analytics — Facebook Pixel + Vercel Analytics ────────────────────
          if (
            id.includes("node_modules/react-facebook-pixel") ||
            id.includes("node_modules/@vercel/analytics")
          ) {
            return "vendor-analytics";
          }

          // Everything else in node_modules → generic vendor chunk
          if (id.includes("node_modules")) {
            return "vendor-misc";
          }

          // ── App code splits (lazy-loaded pages stay as their own chunks) ───
          // Pages under src/pages/admin/ → single admin chunk
          // (admin is never visited by shoppers, keep out of main bundle)
          if (id.includes("/src/pages/admin/")) {
            return "app-admin";
          }
        },

        // ── Asset file naming — content-hash for long-term caching ────────────
        // Format: assets/[name]-[hash].[ext]
        // The hash changes only when file content changes → safe forever-cache.
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const name = assetInfo.names?.[0] ?? "";

          // Fonts → assets/fonts/
          if (/\.(woff2?|eot|ttf|otf)$/i.test(name)) {
            return "assets/fonts/[name]-[hash][extname]";
          }
          // Images → assets/images/
          if (/\.(png|jpe?g|gif|svg|webp|avif|ico)$/i.test(name)) {
            return "assets/images/[name]-[hash][extname]";
          }
          // CSS → assets/css/
          if (/\.css$/i.test(name)) {
            return "assets/css/[name]-[hash][extname]";
          }
          // Everything else
          return "assets/[name]-[hash][extname]";
        },
      },
    },

    // Generate sourcemaps for production error tracking (GTM / Sentry-ready).
    // 'hidden' = map files are written to disk but NOT referenced in bundle,
    // so they're only accessible to your error-monitoring tool, not end users.
    sourcemap: "hidden",

    // Minify with esbuild (Vite default) — fastest option, no config needed.
    minify: "esbuild",
  },

  // ─── Dev server ────────────────────────────────────────────────────────────
  server: {
    port: 5173,
    // Warm up the modules that are always needed on first page load
    // so the first HMR is instant even on cold start.
    warmup: {
      clientFiles: [
        "./src/main.tsx",
        "./src/App.tsx",
        "./src/pages/Home.tsx",
        "./src/components/layout/index.tsx",
      ],
    },
  },

  // ─── Preview server (vite preview) ────────────────────────────────────────
  preview: {
    port: 4173,
    // Simulate production cache headers locally so you can verify
    // that chunk splitting + cache strategy works before deploying.
    headers: {
      // Hashed assets → cache forever
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  },

  // ─── Dependency pre-bundling ───────────────────────────────────────────────
  optimizeDeps: {
    // Force-include heavy deps so Vite pre-bundles them on first dev start
    // instead of discovering them lazily (which causes waterfall reloads).
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "zustand",
      "framer-motion",
      "lucide-react",
      "@supabase/supabase-js",
      "react-helmet-async",
      "clsx",
      "tailwind-merge",
    ],
    // Exclude Cloudinary from pre-bundling — its ESM build is already optimal
    // and pre-bundling it causes a spurious "failed to resolve" warning in dev.
    exclude: ["@cloudinary/url-gen", "@cloudinary/react"],
  },
});