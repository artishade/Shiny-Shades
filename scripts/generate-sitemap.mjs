import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Read domain from siteConfig.ts
const siteConfigPath = path.join(__dirname, '../src/config/siteConfig.ts');
let domain = 'https://shinyshades.vercel.app'; // fallback
if (fs.existsSync(siteConfigPath)) {
  const content = fs.readFileSync(siteConfigPath, 'utf8');
  const match = content.match(/domain:\s*['"]([^'"]+)['"]/);
  if (match && match[1]) {
    domain = match[1].replace(/\/+$/, ''); // strip ALL trailing slashes
  }
}

// 2. Static routes (these never come from the DB)
const routes = [
  { path: '', changefreq: 'daily', priority: '1.0', lastmod: new Date().toISOString() },
  { path: 'shop', changefreq: 'daily', priority: '0.9', lastmod: new Date().toISOString() },
  { path: 'search', changefreq: 'daily', priority: '0.7', lastmod: new Date().toISOString() },
];

// 3. Pull live categories + products from Supabase (M1 fix — was reading
//    mockData.ts via regex before, so anything added through the admin
//    panel never made it into the sitemap).
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '[generate-sitemap] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.\n' +
    'This script needs them at build time (set in Vercel Project Settings > Environment Variables).\n' +
    'Falling back to static routes only — categories/products will be missing from the sitemap.'
  );
} else {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .eq('is_active', true);

  if (catError) {
    console.error('[generate-sitemap] Failed to fetch categories:', catError.message);
  } else {
    for (const cat of categories ?? []) {
      routes.push({
        path: `category/${cat.slug}`,
        changefreq: 'weekly',
        priority: '0.8',
        lastmod: cat.updated_at ?? new Date().toISOString(),
      });
    }
  }

  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('is_active', true);

  if (prodError) {
    console.error('[generate-sitemap] Failed to fetch products:', prodError.message);
  } else {
    for (const prod of products ?? []) {
      routes.push({
        path: `product/${prod.slug}`,
        changefreq: 'weekly',
        priority: '0.6',
        lastmod: prod.updated_at ?? new Date().toISOString(),
      });
    }
  }
}

// 4. Generate XML content (M12 fix — adds <lastmod> to every entry)
const toIsoDate = (value) => new Date(value).toISOString().split('T')[0];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(r => `  <url>
    <loc>${domain}/${r.path}</loc>
    <lastmod>${toIsoDate(r.lastmod)}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

// 5. Write to public/sitemap.xml
const outputPath = path.join(__dirname, '../public/sitemap.xml');
fs.writeFileSync(outputPath, xml.trim() + '\n', 'utf8');
console.log(`Successfully generated sitemap with ${routes.length} URLs at public/sitemap.xml`);