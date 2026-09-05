/**
 * Vision autofill for the admin product form.
 *
 * Takes one product image and returns title / descriptions / tags / colors.
 * Everything the model sends back is untrusted input: the response object is
 * rebuilt field by field and clamped here, because the client applies it
 * verbatim into the form.
 *
 * The first call walks the credential chain, so a dead key or an exhausted
 * quota falls through to the next provider.
 */

import { requireAdmin } from './_lib/requireAdmin.js';
import { checkRateLimitStrict } from './_lib/rateLimit.js';
import { providerError, recordCredentialOutcome, resolveCredentialChain } from './_lib/aiCredentials.js';
import { badOutputError, clamp, cleanHint, cleanTags, requestJsonObject } from './_lib/aiJson.js';
import { SIMPLE_COLOR_NAMES, snapColorNames } from '../../lib/simpleColors';

export const config = {
    api: { bodyParser: { sizeLimit: '4mb' } },
    maxDuration: 60,
};

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const PROVIDER_TIMEOUT_MS = 20000;

// Two attempts across the chain, leaving room for the JSON retry.
const PROVIDER_BUDGET_MS = 40000;
const DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif|avif);base64,([A-Za-z0-9+/=\s]+)$/i;

// Cloudinary is the only host this project uploads images to
// (src/lib/cloudinary.ts). Pinning the allowlist to it keeps this route from
// becoming an SSRF fetcher for arbitrary internal addresses.
const ALLOWED_IMAGE_HOST = 'res.cloudinary.com';

const SYSTEM_PROMPT = [
    "You write e-commerce catalog copy for a women's fashion store in Bangladesh.",
    'Reply with ONE JSON object and nothing else. No markdown, no code fences, no commentary.',
    'Use exactly these keys: title, shortDescription, description, tags, colors.',
    '- title: string, max 60 characters, no brand name, no quote marks.',
    '- shortDescription: string, one sentence, max 160 characters.',
    '- description: string, 2-4 sentences, max 700 characters, covering fabric, fit and styling as seen in the photo.',
    '- tags: array of 6-12 short lowercase search keywords, no "#", no duplicates.',
    `- colors: array of at most 4 colors visible on the garment, chosen VERBATIM from this list: ${SIMPLE_COLOR_NAMES.join(', ')}.`,
    'Omit a color rather than invent a name that is not on that list.',
    'Describe only what is visible. Never state sizes, fabric percentages, prices or care instructions.',
].join('\n');

function buildUserContent(imageDataUrl, hints) {
    const notes = ['Write the catalog entry for this product.'];
    if (hints.category) notes.push(`Category: ${hints.category}`);
    if (hints.priceHint) notes.push(`Price: ${hints.priceHint} BDT`);
    if (hints.existingText) notes.push(`Admin notes, treat as facts: ${hints.existingText}`);

    return [
        { type: 'text', text: notes.join('\n') },
        { type: 'image_url', image_url: { url: imageDataUrl } },
    ];
}

const fail = (status, code, error) => ({ status, code, error });

async function fetchImageBytes(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            return fail(400, 'bad_request', `Could not download that image (HTTP ${response.status}).`);
        }

        const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (!contentType.startsWith('image/')) {
            return fail(400, 'bad_request', 'That URL did not return an image.');
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.byteLength > MAX_IMAGE_BYTES) {
            return fail(413, 'image_too_large', 'The stored image is too large to analyze.');
        }

        return { dataUrl: `data:${contentType};base64,${buffer.toString('base64')}` };
    } catch {
        return fail(502, 'provider_error', 'Could not download that image.');
    } finally {
        clearTimeout(timer);
    }
}

/**
 * New products send compressed bytes (the file is not on Cloudinary yet);
 * edit mode sends the already-uploaded URL. Only the source differs — the
 * model call downstream is byte-identical either way.
 */
async function resolveImage(body) {
    const base64 = typeof body?.imageBase64 === 'string' ? body.imageBase64.trim() : '';
    if (base64) {
        const match = DATA_URL_RE.exec(base64);
        if (!match) return fail(400, 'bad_request', 'imageBase64 must be a base64 image data URL.');

        const bytes = Math.floor((match[2].replace(/\s/g, '').length * 3) / 4);
        if (bytes > MAX_IMAGE_BYTES) {
            return fail(413, 'image_too_large', 'Image is too large. Compress it below 3 MB.');
        }
        return { dataUrl: base64 };
    }

    const imageUrl = typeof body?.imageUrl === 'string' ? body.imageUrl.trim() : '';
    if (!imageUrl) return fail(400, 'bad_request', 'Send imageBase64 or imageUrl.');

    let parsed;
    try {
        parsed = new URL(imageUrl);
    } catch {
        return fail(400, 'bad_request', 'imageUrl is not a valid URL.');
    }

    if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== ALLOWED_IMAGE_HOST) {
        return fail(400, 'bad_request', `imageUrl must be an https ${ALLOWED_IMAGE_HOST} link.`);
    }

    return fetchImageBytes(parsed.toString());
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
    }

    const auth = await requireAdmin(req, res);
    if (!auth.ok) return;

    const allowed = await checkRateLimitStrict(`ai-metadata:${auth.admin.email}`, 20, 300);
    if (!allowed) {
        return res.status(429).json({
            error: 'Too many generations. Try again in a few minutes.',
            code: 'rate_limited',
        });
    }

    try {
        const image = await resolveImage(req.body);
        if (image.error) return res.status(image.status).json({ error: image.error, code: image.code });

        const chain = await resolveCredentialChain(auth.supabase);
        if (!chain.length) {
            return res.status(503).json({
                error: 'No AI credential configured. Add one on the API Keys page.',
                code: 'no_credentials',
            });
        }

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: buildUserContent(image.dataUrl, {
                    category: cleanHint(req.body?.category, 60),
                    priceHint: cleanHint(req.body?.priceHint, 20),
                    existingText: cleanHint(req.body?.existingText, 400),
                }),
            },
        ];

        // A text-only model rejects the image with a 400, which the chain treats
        // as retryable — so a non-vision credential is skipped rather than fatal.
        const result = await requestJsonObject(chain, messages, {
            temperature: 0.4,
            maxTokens: 700,
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

        // Built key by key: the model's object is never spread, so an unexpected
        // key cannot reach the form.
        return res.status(200).json({
            ok: true,
            data: {
                title: clamp(parsed.title, 70),
                shortDescription: clamp(parsed.shortDescription, 200),
                description: clamp(parsed.description, 900),
                tags: cleanTags(parsed.tags),
                colors,
            },
            meta: {
                model: cred.model,
                credentialLabel: cred.label,
                droppedColors: dropped,
                switchedFrom: result.call.attempts.map((a) => `${a.cred.label} (${a.status})`),
            },
        });
    } catch (err) {
        console.error('[ai-product-metadata]', err);
        return res.status(500).json({ error: 'Something went wrong.', code: 'server_error' });
    }
}
