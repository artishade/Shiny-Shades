/**
 * PII-free aggregated digest of the store, stuffed into the /api/ai-chat
 * system prompt on every turn.
 *
 * Three constraints shape this file:
 *  - No customer identity leaves the server. Names, emails, addresses and order
 *    numbers are never selected; phone is read only to key repeat buyers and is
 *    never emitted. serializeSnapshot ends by calling assertNoPii.
 *  - orders.notes is never included. It is the only field in here an outsider
 *    can write, so excluding it removes the prompt-injection channel; a
 *    present/absent count keeps the useful signal.
 *  - Four columns are frozen at 0 in the live database and must not be trusted:
 *    products.rating, products.review_count, coupons.used_count and
 *    categories.product_count. Anything derivable is derived instead.
 */

const ORDER_LIMIT = 400;
const PRODUCT_LIMIT = 500;
const MAX_DIGEST_CHARS = 7000;
const TZ = 'Asia/Dhaka';

// UTC midnight is 6am in Dhaka, so bucketing on the raw timestamp puts six
// hours of every day in the wrong bucket.
const dayKey = (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-CA', { timeZone: TZ });
};

const monthKey = (iso) => dayKey(iso).slice(0, 7);

const num = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const taka = (value) => Math.round(num(value));

const label = (value) =>
    String(value ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 48);

const median = (values) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

const dayNumber = (key) => {
    if (!key) return NaN;
    const [y, m, d] = key.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};

const emptyBucket = () => ({ orders: 0, revenue: 0, gross: 0 });

const addToBucket = (bucket, row) => {
    bucket.orders += 1;
    bucket.revenue += row.revenue;
    bucket.gross += row.gross;
};

const withAov = (bucket) => ({
    ...bucket,
    revenue: Math.round(bucket.revenue),
    gross: Math.round(bucket.gross),
    aov: bucket.orders ? Math.round(bucket.revenue / bucket.orders) : 0,
});

const bump = (map, key, by = 1) => {
    if (!key) return;
    map.set(key, (map.get(key) || 0) + by);
};

const topEntries = (map, count) =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, count);

export async function buildStoreSnapshot(supabase) {
    // coupons is queried with select('*') on purpose: the live schema has
    // drifted from supabase/schema.sql before, and naming a column that no
    // longer exists would fail the whole request with a Postgres 42703.
    const [orderRes, productRes, categoryRes, couponRes, siteRes, orderCount, productCount] =
        await Promise.all([
            supabase
                .from('orders')
                .select(
                    'status, payment_status, payment_method, coupon_code, subtotal, discount, ' +
                        'shipping_charge, total, created_at, customer_city, customer_district, ' +
                        'customer_phone, notes, items',
                )
                .order('created_at', { ascending: false })
                .limit(ORDER_LIMIT),
            supabase
                .from('products')
                .select(
                    'name, price, compare_price, category_name, category_slug, stock, sizes, ' +
                        'colors, is_active, is_featured, is_trending, is_new_arrival, is_on_sale',
                )
                .limit(PRODUCT_LIMIT),
            supabase.from('categories').select('name, slug, parent_id').limit(100),
            supabase.from('coupons').select('*').limit(100),
            supabase.from('site_content').select('content').eq('id', 'global-content').maybeSingle(),
            supabase.from('orders').select('id', { count: 'exact', head: true }),
            supabase.from('products').select('id', { count: 'exact', head: true }),
        ]);

    if (orderRes.error) throw new Error(`orders query failed: ${orderRes.error.message}`);
    if (productRes.error) throw new Error(`products query failed: ${productRes.error.message}`);

    for (const [name, result] of [
        ['categories', categoryRes],
        ['coupons', couponRes],
        ['site_content', siteRes],
    ]) {
        if (result.error) console.error(`[storeSnapshot] ${name} query failed:`, result.error);
    }

    const orders = orderRes.data || [];
    const products = productRes.data || [];
    const categories = categoryRes.data || [];
    const coupons = couponRes.data || [];
    const site = siteRes.data?.content || {};

    const orderSections = summarizeOrders(orders);
    const { soldNames, ...sections } = orderSections;

    return {
        coverage: {
            ordersFetched: orders.length,
            ordersTotal: orderCount.count ?? orders.length,
            productsFetched: products.length,
            productsTotal: productCount.count ?? products.length,
            categories: categories.length,
            coupons: coupons.length,
        },
        ...sections,
        ...summarizeCatalog(products, categories, soldNames),
        coupon: summarizeCoupons(coupons, orders),
        site: summarizeSite(site),
    };
}

// Seeded so a status with no orders still reports zero instead of vanishing.
const CANONICAL_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

function summarizeOrders(orders) {
    const todayNumber = dayNumber(dayKey(new Date().toISOString()));

    const buckets = {
        today: emptyBucket(),
        yesterday: emptyBucket(),
        last7d: emptyBucket(),
        last30d: emptyBucket(),
        prev30d: emptyBucket(),
        window: emptyBucket(),
    };
    const months = new Map();
    const statuses = new Map(CANONICAL_STATUSES.map((status) => [status, 0]));
    const paymentStatus = new Map();
    const paymentMethod = new Map();
    const cities = new Map();
    const zones = new Map();
    const units = new Map();
    const productRevenue = new Map();
    const sizes = new Map();
    const colors = new Map();
    const shippingTiers = new Map();
    const buyers = new Map();

    let shippingTotal = 0;
    let cancelledValue = 0;
    let notesPresent = 0;

    for (const row of orders) {
        const status = String(row.status || 'unknown');
        bump(statuses, status);
        bump(paymentStatus, String(row.payment_status || 'unknown'));

        const subtotal = num(row.subtotal);
        const discount = num(row.discount);
        const total = num(row.total);
        const revenue = subtotal - discount;

        if (String(row.notes ?? '').trim().replace(/^-$/, '')) notesPresent += 1;

        if (status === 'cancelled') {
            cancelledValue += total;
            continue;
        }

        const row2 = { revenue, gross: total };
        addToBucket(buckets.window, row2);

        const age = todayNumber - dayNumber(dayKey(row.created_at));
        if (age === 0) addToBucket(buckets.today, row2);
        if (age === 1) addToBucket(buckets.yesterday, row2);
        if (age >= 0 && age < 7) addToBucket(buckets.last7d, row2);
        if (age >= 0 && age < 30) addToBucket(buckets.last30d, row2);
        if (age >= 30 && age < 60) addToBucket(buckets.prev30d, row2);

        const month = monthKey(row.created_at);
        if (month) {
            const entry = months.get(month) || { orders: 0, revenue: 0 };
            entry.orders += 1;
            entry.revenue += revenue;
            months.set(month, entry);
        }

        // The shipping_charge column is null on every live row, so the amount is
        // recovered from checkout's own arithmetic: total = subtotal - discount + shipping.
        const shipping =
            row.shipping_charge == null ? Math.max(0, total - subtotal + discount) : num(row.shipping_charge);
        shippingTotal += shipping;
        bump(shippingTiers, String(taka(shipping)));

        const method = String(row.payment_method || 'unknown');
        const methodEntry = paymentMethod.get(method) || { orders: 0, revenue: 0 };
        methodEntry.orders += 1;
        methodEntry.revenue += revenue;
        paymentMethod.set(method, methodEntry);

        const city = label(row.customer_city) || 'unknown';
        const cityEntry = cities.get(city) || { orders: 0, revenue: 0 };
        cityEntry.orders += 1;
        cityEntry.revenue += revenue;
        cities.set(city, cityEntry);

        bump(zones, label(row.customer_district) || 'unknown');

        for (const item of Array.isArray(row.items) ? row.items : []) {
            const name = label(item?.productName);
            const quantity = Math.max(0, Math.round(num(item?.quantity)));
            if (!name || !quantity) continue;
            bump(units, name, quantity);
            bump(productRevenue, name, num(item?.price) * quantity);
            if (item?.size) bump(sizes, label(item.size), quantity);
            if (item?.color) bump(colors, label(item.color), quantity);
        }

        // Phone is the only buyer key that exists (customer_email is written as
        // an empty string by checkout). It is hashed to a label and never emitted.
        const phone = String(row.customer_phone || '').replace(/\D/g, '').slice(-11);
        if (phone) {
            const buyer = buyers.get(phone) || { orders: 0, revenue: 0, city, first: '', last: '' };
            const day = dayKey(row.created_at);
            buyer.orders += 1;
            buyer.revenue += revenue;
            if (!buyer.last || day > buyer.last) buyer.last = day;
            if (!buyer.first || day < buyer.first) buyer.first = day;
            buyers.set(phone, buyer);
        }
    }

    return assembleOrderSections({
        orders,
        buckets,
        months,
        statuses,
        paymentStatus,
        paymentMethod,
        cities,
        zones,
        units,
        productRevenue,
        sizes,
        colors,
        shippingTiers,
        shippingTotal,
        cancelledValue,
        notesPresent,
        buyers,
    });
}

function assembleOrderSections(agg) {
    const days = agg.orders.map((row) => dayKey(row.created_at)).filter(Boolean).sort();
    const uniqueBuyers = agg.buyers.size;
    const repeat = [...agg.buyers.values()].filter((buyer) => buyer.orders > 1).length;

    return {
        window: { from: days[0] || '', to: days[days.length - 1] || '' },
        soldNames: new Set(agg.units.keys()),
        revenue: {
            today: withAov(agg.buckets.today),
            yesterday: withAov(agg.buckets.yesterday),
            last7d: withAov(agg.buckets.last7d),
            last30d: withAov(agg.buckets.last30d),
            prev30d: withAov(agg.buckets.prev30d),
            window: withAov(agg.buckets.window),
            months: [...agg.months.entries()]
                .sort((a, b) => (a[0] < b[0] ? 1 : -1))
                .slice(0, 6)
                .map(([month, entry]) => ({ month, orders: entry.orders, revenue: taka(entry.revenue) })),
        },
        shipping: { tiers: topEntries(agg.shippingTiers, 6), total: taka(agg.shippingTotal) },
        status: { counts: [...agg.statuses.entries()], cancelledValue: taka(agg.cancelledValue) },
        payment: {
            statuses: [...agg.paymentStatus.entries()],
            methods: [...agg.paymentMethod.entries()]
                .map(([method, entry]) => ({ method, orders: entry.orders, revenue: taka(entry.revenue) }))
                .sort((a, b) => b.orders - a.orders),
        },
        geography: {
            cities: [...agg.cities.entries()]
                .sort((a, b) => b[1].orders - a[1].orders)
                .slice(0, 10)
                .map(([city, entry]) => ({ city, orders: entry.orders, revenue: taka(entry.revenue) })),
            zones: topEntries(agg.zones, 6),
        },
        demand: {
            topProducts: topEntries(agg.units, 12).map(([name, sold]) => ({
                name,
                units: sold,
                revenue: taka(agg.productRevenue.get(name) || 0),
            })),
            sizes: topEntries(agg.sizes, 8),
            colors: topEntries(agg.colors, 8),
            notesPresent: agg.notesPresent,
        },
        buyers: {
            unique: uniqueBuyers,
            repeat,
            repeatRate: uniqueBuyers ? Math.round((repeat / uniqueBuyers) * 100) : 0,
            top: rankBuyers(agg.buyers),
        },
    };
}

/** Aliases, never keys: the model gets spending shape without an identity. */
const rankBuyers = (buyers) =>
    [...buyers.values()]
        .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
        .slice(0, 8)
        .map((buyer, index) => ({
            alias: `Customer ${String.fromCharCode(65 + index)}`,
            orders: buyer.orders,
            revenue: taka(buyer.revenue),
            city: buyer.city,
            first: buyer.first,
            last: buyer.last,
        }));

function summarizeCatalog(products, categories, soldNames) {
    const active = products.filter((row) => row.is_active !== false);
    const prices = active.map((row) => taka(row.price)).filter((price) => price > 0);
    const perCategory = new Map();
    const sizes = new Map();
    const colors = new Map();

    const out = [];
    const low = [];
    let healthy = 0;
    let discounted = 0;
    const flags = { featured: 0, trending: 0, newArrival: 0, onSale: 0 };

    for (const row of active) {
        const name = label(row.name);
        const stock = Math.round(num(row.stock));
        if (stock <= 0) out.push(name);
        else if (stock <= 10) low.push(`${name} ${stock}`);
        else healthy += 1;

        if (taka(row.compare_price) > taka(row.price)) discounted += 1;
        if (row.is_featured) flags.featured += 1;
        if (row.is_trending) flags.trending += 1;
        if (row.is_new_arrival) flags.newArrival += 1;
        if (row.is_on_sale) flags.onSale += 1;

        bump(perCategory, label(row.category_name) || label(row.category_slug) || 'uncategorized');
        for (const size of Array.isArray(row.sizes) ? row.sizes : []) bump(sizes, label(size));
        for (const color of Array.isArray(row.colors) ? row.colors : []) bump(colors, label(color));
    }

    return {
        catalog: {
            active: active.length,
            inactive: products.length - active.length,
            flags,
            discounted,
            priceMin: prices.length ? Math.min(...prices) : 0,
            priceMedian: median(prices),
            priceMax: prices.length ? Math.max(...prices) : 0,
            noColors: active.filter((row) => !(Array.isArray(row.colors) ? row.colors.length : 0)).length,
            categories: topEntries(perCategory, 15),
            emptyCategories: categories
                .map((row) => label(row.name))
                .filter((name) => name && !perCategory.has(name)),
            sizes: topEntries(sizes, 8),
            colors: topEntries(colors, 10),
        },
        inventory: { out, low, healthy },
        // Matched on product name, because order items store the name they were
        // bought under: a renamed product reads as never sold.
        neverSold: active.map((row) => label(row.name)).filter((name) => name && !soldNames.has(name)),
    };
}

/** Stored used_count is dead (incrementCouponUsage is never called), so real
 *  usage is counted off orders.coupon_code and reported beside it. */
function summarizeCoupons(coupons, orders) {
    const seen = new Map();
    for (const row of orders) {
        if (row.status === 'cancelled') continue;
        const code = label(row.coupon_code).toUpperCase();
        if (code) bump(seen, code);
    }

    const rows = coupons.slice(0, 10).map((row) => {
        const code = label(row.code).toUpperCase();
        return {
            code,
            type: label(row.type),
            discount: taka(row.discount),
            minOrder: taka(row.min_order_amount),
            maxUses: Math.round(num(row.max_uses)),
            storedUses: Math.round(num(row.used_count)),
            derivedUses: seen.get(code) || 0,
            active: row.is_active !== false,
            expires: row.expires_at ? dayKey(row.expires_at) : '',
        };
    });

    return {
        rows,
        orphanCodes: [...seen.entries()].filter(([code]) => !rows.some((row) => row.code === code)),
    };
}

function summarizeSite(site) {
    const settings = site.siteSettings || {};
    const announcement = site.announcement || {};
    const banners = Array.isArray(site.banners) ? site.banners : [];
    const count = (value) => (Array.isArray(value) ? value.length : 0);

    return {
        name: label(settings.siteName),
        currency: label(settings.currency) || 'BDT',
        currencySymbol: label(settings.currencySymbol),
        paymentMethods: (Array.isArray(settings.paymentMethods) ? settings.paymentMethods : [])
            .map(label)
            .filter(Boolean),
        heroEnabled: !!site.heroEnabled,
        banners: banners.length,
        activeBanners: banners.filter((banner) => banner?.active !== false).length,
        saleBanners: count(site.saleBanners),
        newArrivalBanners: count(site.newArrivalBanners),
        announcementEnabled: !!announcement.enabled,
        announcementMessages: count(announcement.messages),
    };
}

// Separator is "; " because product and category names legitimately contain "|".
const joinPairs = (entries, separator = '; ') =>
    entries.map(([key, value]) => `${key} x${value}`).join(separator) || 'none';

const bucketLine = (name, bucket) =>
    bucket.orders
        ? `  ${name}: orders ${bucket.orders} revenue ${bucket.revenue} gross ${bucket.gross} aov ${bucket.aov}`
        : `  ${name}: no orders`;

const listLine = (values, cap) => {
    if (!values.length) return 'none';
    const shown = values.slice(0, cap).join('; ');
    return values.length > cap ? `${shown}; +${values.length - cap} more` : shown;
};

function buildSections(digest) {
    const { coverage: cover, revenue } = digest;
    const sections = new Map();

    sections.set('HEADER', '=== SHINY SHADES STORE SNAPSHOT (all money in BDT, whole taka) ===');

    sections.set(
        'COVERAGE',
        `COVERAGE: orders ${cover.ordersFetched} of ${cover.ordersTotal} analyzed (newest first, cap ${ORDER_LIMIT}) | ` +
            `products ${cover.productsFetched} of ${cover.productsTotal} | categories ${cover.categories} | ` +
            `coupon rows ${cover.coupons} | order window ${digest.window.from || 'n/a'}..${digest.window.to || 'n/a'} (Asia/Dhaka)`,
    );

    sections.set(
        'REVENUE',
        [
            'REVENUE: revenue = subtotal - discount (excludes shipping); gross = order total (includes shipping); cancelled orders excluded',
            bucketLine('today', revenue.today),
            bucketLine('yesterday', revenue.yesterday),
            bucketLine('last_7_days', revenue.last7d),
            bucketLine('last_30_days', revenue.last30d),
            bucketLine('previous_30_days', revenue.prev30d),
            bucketLine('whole_analyzed_window', revenue.window),
            `  by_month: ${revenue.months.map((m) => `${m.month} orders ${m.orders} revenue ${m.revenue}`).join(' | ') || 'none'}`,
        ].join('\n'),
    );

    sections.set(
        'SHIPPING',
        'SHIPPING (derived per order as total - subtotal + discount, because the shipping_charge column is empty; ' +
            `checkout charges 80 inside Dhaka, 150 outside): ${joinPairs(digest.shipping.tiers.map(([amount, count]) => [`${amount}tk`, count]))} | collected ${digest.shipping.total}`,
    );

    sections.set(
        'STATUS',
        `ORDER STATUS: ${joinPairs(digest.status.counts)} | value of cancelled orders ${digest.status.cancelledValue}`,
    );

    sections.set(
        'PAYMENT',
        `PAYMENT: payment_status ${joinPairs(digest.payment.statuses)} || method ` +
            `${digest.payment.methods.map((m) => `${m.method} orders ${m.orders} revenue ${m.revenue}`).join(' | ') || 'none'}`,
    );

    return addRemainingSections(sections, digest);
}

function addRemainingSections(sections, digest) {
    const { catalog, inventory, coupon, site, demand, buyers, coverage } = digest;

    sections.set(
        'GEOGRAPHY',
        [
            'GEOGRAPHY (customer_city holds the city or district typed at checkout)',
            ...digest.geography.cities.map((c) => `  ${c.city} orders ${c.orders} revenue ${c.revenue}`),
        ].join('\n'),
    );

    sections.set(
        'ZONES',
        `DELIVERY ZONES (customer_district holds the zone label, not a district): ${joinPairs(digest.geography.zones)}`,
    );

    sections.set(
        'TOP PRODUCTS',
        [
            'TOP PRODUCTS sold (from order items)',
            ...demand.topProducts.map((p) => `  ${p.name} — sold ${p.units}, revenue ${p.revenue}`),
        ].join('\n'),
    );

    sections.set('SIZES', `SIZES sold: ${joinPairs(demand.sizes)}`);
    sections.set('COLORS', `COLORS sold: ${joinPairs(demand.colors)}`);

    sections.set(
        'NEVER SOLD',
        `NEVER SOLD: ${digest.neverSold.length} of ${catalog.active} active products have no recorded sale in this window` +
            (digest.neverSold.length ? ` — e.g. ${listLine(digest.neverSold, 10)}` : ''),
    );

    sections.set(
        'INVENTORY',
        [
            `INVENTORY (active products only): out of stock ${inventory.out.length} | stock 1-10 ${inventory.low.length} | stock above 10 ${inventory.healthy}`,
            `  out of stock: ${listLine(inventory.out, 15)}`,
            `  low stock (name then units left): ${listLine(inventory.low, 15)}`,
        ].join('\n'),
    );

    sections.set(
        'CATALOG',
        [
            `CATALOG: active ${catalog.active} | inactive ${catalog.inactive} | featured ${catalog.flags.featured} | ` +
                `trending ${catalog.flags.trending} | new arrival ${catalog.flags.newArrival} | on sale flag ${catalog.flags.onSale} | ` +
                `compare_price above price ${catalog.discounted} | no colors set ${catalog.noColors} | ` +
                `price min ${catalog.priceMin} median ${catalog.priceMedian} max ${catalog.priceMax}`,
            `  products per category: ${joinPairs(catalog.categories)}`,
            `  categories with no active product: ${listLine(catalog.emptyCategories, 10)}`,
            `  sizes offered: ${joinPairs(catalog.sizes)}`,
            `  colors offered: ${joinPairs(catalog.colors)}`,
        ].join('\n'),
    );

    return addTailSections(sections, { coupon, site, demand, buyers, coverage });
}

const NOT_AVAILABLE = [
    'DATA NOT AVAILABLE — the store records none of this. Say so plainly and never estimate it:',
    '  visitors, sessions, pageviews, traffic sources, referrers, bounce rate, time on page',
    '  conversion rate, cart abandonment, product views, wishlist adds, on-site search terms',
    '  ad spend, ROAS, campaign or post performance, email and social engagement',
    '  reviews and ratings — products.rating and products.review_count are hardcoded 0, there is no review feature',
    '  cost price, so no profit, margin or COGS is computable',
    '  customer names, phones, emails, addresses and order numbers — withheld from this snapshot on purpose; the owner reads them on the Orders page',
    '  Analytics is send-only here: Google Tag Manager and the Facebook Pixel push events out and nothing reads them back. For traffic or audience questions, point the owner at GA4 or Meta Events Manager.',
].join('\n');

function addTailSections(sections, { coupon, site, demand, buyers, coverage }) {
    sections.set(
        'COUPONS',
        [
            'COUPONS (stored_uses is a dead column, always 0 — derived_uses is counted off orders.coupon_code)',
            ...coupon.rows.map(
                (row) =>
                    `  ${row.code} ${row.type || 'type?'} ${row.discount} min_order ${row.minOrder} ` +
                    `derived_uses ${row.derivedUses} stored_uses ${row.storedUses} max_uses ${row.maxUses} ` +
                    `${row.active ? 'active' : 'inactive'}${row.expires ? ` expires ${row.expires}` : ''}`,
            ),
            coupon.rows.length ? '' : '  no coupon rows configured',
            coupon.orphanCodes.length
                ? `  codes used on orders but not in the coupons table: ${joinPairs(coupon.orphanCodes)}`
                : '',
        ]
            .filter(Boolean)
            .join('\n'),
    );

    sections.set(
        'BUYERS',
        [
            `REPEAT BUYERS: ${buyers.unique} distinct buyers (keyed on phone) | ${buyers.repeat} bought more than once | repeat rate ${buyers.repeatRate}%`,
            ...buyers.top.map(
                (b) => `  ${b.alias} orders ${b.orders} revenue ${b.revenue} city ${b.city} first ${b.first} last ${b.last}`,
            ),
        ].join('\n'),
    );

    sections.set(
        'SITE',
        `SITE: name ${site.name || 'unset'} | currency ${site.currency}` +
            (site.currencySymbol ? ` (symbol ${site.currencySymbol})` : '') +
            ` | payment methods ${site.paymentMethods.join(', ') || 'none listed'}` +
            ` | hero section ${site.heroEnabled ? 'on' : 'off'}` +
            ` | banners ${site.banners} (${site.activeBanners} active) | sale banners ${site.saleBanners}` +
            ` | new arrival banners ${site.newArrivalBanners}` +
            ` | announcement bar ${site.announcementEnabled ? 'on' : 'off'} with ${site.announcementMessages} message(s)`,
    );

    sections.set(
        'NOTES',
        `ORDER NOTES: ${demand.notesPresent} of ${coverage.ordersFetched} analyzed orders carry a delivery note. ` +
            'The text is deliberately not included — it is customer-written; read it on the Orders page.',
    );

    sections.set('UNAVAILABLE', NOT_AVAILABLE);
    return sections;
}

const trimLines = (sections, key, keep) => {
    const lines = String(sections.get(key) || '').split('\n');
    if (lines.length <= keep + 1) return;
    const dropped = lines.length - keep - 1;
    sections.set(key, [...lines.slice(0, keep + 1), `  …${dropped} more omitted for length`].join('\n'));
};

const PHONE_RE = /(?:\+?88)?01[3-9]\d{8}/;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/**
 * Last line of defence before the digest leaves the server for a third-party
 * gateway. A false positive fails the request, which is the safe direction.
 */
export function assertNoPii(text) {
    if (PHONE_RE.test(text)) throw new Error('snapshot blocked: phone-like value in digest');
    if (EMAIL_RE.test(text)) throw new Error('snapshot blocked: email-like value in digest');
    return text;
}

/**
 * Labelled text rather than JSON: it is roughly a third smaller across the
 * repeated-key sections, and small models fed "KEY: value" answer in prose
 * instead of echoing JSON back or inventing sibling keys.
 */
export function serializeSnapshot(digest) {
    const sections = buildSections(digest);
    const render = () => [...sections.values()].filter(Boolean).join('\n');

    const trims = [
        () => sections.delete('NEVER SOLD'),
        () => sections.delete('COLORS'),
        () => sections.delete('SIZES'),
        () => trimLines(sections, 'COUPONS', 5),
        () => trimLines(sections, 'GEOGRAPHY', 5),
        () => trimLines(sections, 'TOP PRODUCTS', 6),
    ];

    let text = render();
    for (const trim of trims) {
        if (text.length <= MAX_DIGEST_CHARS) break;
        trim();
        text = render();
    }

    // The honesty rules are the one section that must survive truncation, so
    // they are cut off with everything else and then put back.
    if (text.length > MAX_DIGEST_CHARS) {
        const tail = sections.get('UNAVAILABLE');
        text = `${text.slice(0, Math.max(0, MAX_DIGEST_CHARS - tail.length - 40))}\n[snapshot truncated]\n${tail}`;
    }

    return assertNoPii(text);
}
