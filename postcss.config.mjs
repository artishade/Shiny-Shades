/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Tailwind v4's dedicated PostCSS plugin — the framework-agnostic
    // replacement for the Vite-only `@tailwindcss/vite` plugin the
    // original vite.config.ts used.
    '@tailwindcss/postcss': {},
  },
};

export default config;
