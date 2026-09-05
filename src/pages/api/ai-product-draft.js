/**
 * Vision drafting for the admin AI chat.
 *
 * Takes 1-4 photos of one product plus whatever the owner typed, and returns a
 * complete catalog draft: name, SEO title, both descriptions, tags, colors and
 * the category it belongs in. Generate-only — nothing is written here. The chat
 * renders the draft as an editable card and publishes from the browser, because
 * the watermark needs a canvas anyway.
 *
 * Everything the model sends back is untrusted: the response is rebuilt field by
 * field, and the category has to match a row that actually exists.
 */

import { requireAdmin } from './_lib/requireAdmin.js';
import { checkRateLimitStrict } from './_lib/rateLimit.js';
import { providerError, recordCredentialOutcome, resolveCredentialChain } from './_lib/aiCredentials.js';
import { badOutputError, clamp, cleanHint, cleanTags, requestJsonObject } from './_lib/aiJson.js';
import { loadPromptTexts } from './_lib/aiPrompts.js';
import { SIMPLE_COLOR_NAMES, snapColorNames } from '../../lib/simpleColors';

export const config = {
    api: { bodyParser: { sizeLimit: '6mb' } },
    maxDuration: 60,
};

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const MAX_CATEGORIES_SENT = 60;
const PROVIDER_TIMEOUT_MS = 20000;

// Two attempts across the chain, leaving room for the JSON retry.
const PROVIDER_BUDGET_MS = 40000;
const DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif|avif);base64,([A-Za-z0-9+/=\s]+)$/i;

/**
 * The field guidance comes from /admin/ai-prompts when the owner has written
 * any; the envelope, the key list, the caps, the colour vocabulary and the live
 * category list do not.
 */
const buildSystemPrompt = (categoryNames, prompts) => [
    "You write e-commerce catalog copy for a women's fashion store in Bangladesh.",
    'The photos are all of ONE product. Write a single catalog entry for it.',
    'Reply with ONE JSON object and nothing else. No markdown, no code fences, no commentary.',
    'Use exactly these keys: name, seoTitle, shortDescription, description, tags, colors, categoryName, suggestedCategory.',
    ...prompts.promptLines(),
    `Every color must be chosen VERBATIM from this list: ${SIMPLE_COLOR_NAMES.join(', ')}.`,
    'Omit a color rather than invent a name that is not on that list.',
    categoryNames.length
        ? `categoryName must be chosen VERBATIM from this list: ${categoryNames.join(', ')}. Use "" if none fit.`
        : 'The store has no categories yet, so categoryName must be "".',
    '- suggestedCategory: "" normally. Only when categoryName is "", the name of a category worth creating, max 40 characters.',
    'Describe only what is visible in the photos. Never state sizes, fabric percentages, prices or care instructions.',
].join('\n');

const fail = (status, code, error) => ({ status, code, error });

/**
 * The chat compresses in the browser before sending, so unlike the products
 * page this route never accepts a URL — the images are not uploaded yet.
 * A rejected image is reported, never silently dropped: the owner has to know
 * which photo the copy was not written from.
 */
function resolveImages(raw) {
    if (!Array.isArray(raw) || !raw.length) return fail(400, 'bad_request', 'Send at least one image.');
    if (raw.length > MAX_IMAGES) {
        return fail(400, 'too_many_images', `Send at most ${MAX_IMAGES} photos of one product.`);
    }

    const dataUrls = [];
    let total = 0;

    for (let i = 0; i < raw.length; i += 1) {
        const value = typeof raw[i] === 'string' ? raw[i].trim() : '';
        const match = DATA_URL_RE.exec(value);
        if (!match) return fail(400, 'bad_request', `Image ${i + 1} is not a base64 image data URL.`);

        const bytes = Math.floor((match[2].replace(/\s/g, '').length * 3) / 4);
        if (bytes > MAX_IMAGE_BYTES) {
            return fail(413, 'image_too_large', `Image ${i + 1} is too large. Compress it below 1.5 MB.`);
        }
        total += bytes;
        if (total > MAX_TOTAL_BYTES) {
            return fail(413, 'image_too_large', 'Those photos are too large together. Send fewer, or smaller ones.');
        }
        dataUrls.push(value);
    }

    return { dataUrls };
}

/**
 * The real category list, so the model picks an existing one instead of
 * inventing a sibling of something that already exists.
 */
async function fetchCategories(supabase) {
    const { data, error } = await supabase
        .from('categories')
        .select('name,slug')
        .order('created_at', { ascending: true })
        .limit(MAX_CATEGORIES_SENT);

    if (error) {
        console.error('[ai-product-draft] category lookup failed:', error.message || error);
        return [];
    }
    return (data || [])
        .filter((row) => row?.name && row?.slug)
        .map((row) => ({ name: String(row.name), slug: String(row.slug) }));
}

function buildUserContent(dataUrls, hints) {
    const notes = ['Write the catalog entry for this product.'];
    if (hints.priceHint) notes.push(`Price: ${hints.priceHint} BDT`);
    if (hints.category) notes.push(`The owner already chose this category: ${hints.category}`);
    if (hints.notes) notes.push(`Owner notes, treat as facts: ${hints.notes}`);
    if (dataUrls.length > 1) notes.push(`${dataUrls.length} photos of the same product follow.`);

    return [
        { type: 'text', text: notes.join('\n') },
        ...dataUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
    }

    const auth = await requireAdmin(req, res);
    if (!auth.ok) return;

    // Bulk mode fires one request per photo, so the burst window has to allow a
    // full batch of 8 plus a retry or two without locking the owner out.
    const burst = await checkRateLimitStrict(`ai-product-draft:${auth.admin.email}`, 30, 300);
    if (!burst) {
        return res.status(429).json({
            error: 'Too many drafts, or the rate limiter is unavailable. Wait a minute and try again.',
            code: 'rate_limited',
        });
    }

    const daily = await checkRateLimitStrict(`ai-product-draft-day:${auth.admin.email}`, 200, 86400);
    if (!daily) {
        return res.status(429).json({
            error: 'Daily limit of 200 product drafts reached. It resets in 24 hours.',
            code: 'daily_limit',
        });
    }

    try {
        const images = resolveImages(req.body?.images);
        if (images.error) return res.status(images.status).json({ error: images.error, code: images.code });

        const chain = await resolveCredentialChain(auth.supabase);
        if (!chain.length) {
            return res.status(503).json({
                error: 'No AI credential configured. Add one on the API Keys page.',
                code: 'no_credentials',
            });
        }

        const categories = await fetchCategories(auth.supabase);
        const categoryNames = categories.map((c) => c.name);
        const prompts = await loadPromptTexts(auth.supabase, 'product-draft');

        const messages = [
            { role: 'system', content: buildSystemPrompt(categoryNames, prompts) },
            {
                role: 'user',
                content: buildUserContent(images.dataUrls, {
                    priceHint: cleanHint(req.body?.priceHint, 20),
                    category: cleanHint(req.body?.category, 60),
                    notes: cleanHint(req.body?.notes, 600),
                }),
            },
        ];

        // A text-only model rejects the image with a 400, which the chain treats
        // as retryable — so a non-vision credential is skipped rather than fatal.
        const result = await requestJsonObject(chain, messages, {
            temperature: 0.5,
            maxTokens: 900,
            timeoutMs: PROVIDER_TIMEOUT_MS,
            budgetMs: PROVIDER_BUDGET_MS,
        });

        await recordCredentialOutcome(auth.supabase, result.call);
        if (!result.ok) {
            return result.badOutput ? badOutputError(res) : providerError(res, result.call);
        }

        const parsed = result.parsed;
        const cred = result.call.cred;
        const { colors, dropped } = snapColorNames(parsed.colors, 6);

        // The model may only name a category that exists; anything else becomes a
        // suggestion the owner has to accept explicitly.
        const namedCategory = clamp(parsed.categoryName, 60).toLowerCase();
        const matched = categories.find((c) => c.name.toLowerCase() === namedCategory) || null;
        const suggested = matched ? '' : clamp(parsed.suggestedCategory || parsed.categoryName, 40);

        // Built key by key: the model's object is never spread, so an unexpected
        // key cannot reach the draft card.
        return res.status(200).json({
            ok: true,
            data: {
                name: clamp(parsed.name, 70),
                seoTitle: clamp(parsed.seoTitle, 70),
                shortDescription: clamp(parsed.shortDescription, 200),
                description: clamp(parsed.description, 900),
                tags: cleanTags(parsed.tags),
                colors,
                categoryName: matched ? matched.name : '',
                categorySlug: matched ? matched.slug : '',
                suggestedCategory: suggested,
            },
            meta: {
                model: cred.model,
                credentialLabel: cred.label,
                droppedColors: dropped,
                imagesAnalyzed: images.dataUrls.length,
                switchedFrom: result.call.attempts.map((a) => `${a.cred.label} (${a.status})`),
            },
        });
    } catch (err) {
        console.error('[ai-product-draft]', err);
        return res.status(500).json({ error: 'Something went wrong.', code: 'server_error' });
    }
}
