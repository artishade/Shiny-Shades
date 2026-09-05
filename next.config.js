/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Vite's build target was ES2020 / evergreen mobile browsers (Chrome-heavy
  // Bangladesh market) — Next.js's SWC compiler targets modern browsers by
  // default already, so no extra transpile config is needed here.

  // The project renders product/category imagery with plain <img> tags
  // pointed at Cloudinary (see src/lib/cloudinary.ts), not next/image, so
  // there's no remotePatterns / domains list to configure.

  // Security headers were previously set in vercel.json's top-level
  // "headers" block. Vercel still reads vercel.json's "headers" for a
  // Next.js project (they aren't tied to the old "framework": "vite"
  // setting), so they're kept there rather than duplicated here.

  experimental: {
    // Rewrites barrel imports to deep per-symbol paths at compile time, so a
    // named import can't drag its whole package into the shared chunk.
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },

  async headers() {
    return [
      {
        // /cart and /checkout are prerendered but hold no per-visitor data —
        // it all lives in localStorage. They dropped getServerSideProps (which
        // cost a /_next/data round trip on every client-side navigation), so
        // the no-store header it used to set is applied here instead.
        source: '/:path(cart|checkout)',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ];
  },
};

module.exports = nextConfig;
