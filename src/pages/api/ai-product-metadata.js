/**
 * Vision autofill for the admin product form.
 *
 * Takes one product image and returns title / descriptions / tags / colors.
 * Everything the model sends back is untrusted input: the response object is
 * rebuilt field by field and clamped here, because the client applies it
 * verbatim into the form.
 */

import { requireAdmin } from './_lib/requireAdmin.js';
import { checkRateLimitStrict } from './_lib/rateLimit.js';
import { callChatCompletions, resolveActiveCredential } from './_lib/aiCredentials.js';
import { SIMPLE_COLOR_NAMES, snapColorNames } from '../../lib/simpleColors';

export const config = {
    api: { bodyParser: { sizeLimit: '4mb' } },
    maxDuration: 30,
};

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
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

const stripTags = (value) =>
    typeof value === 'string' ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';

/** Clamps to a budget, backing off to a word boundary when one is close. */
function clamp(value, max) {
    const text = stripTags(value);
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

const cleanHint = (value, maxLength) => {
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return stripTags(value).slice(0, maxLength);
};

function cleanTags(values) {
    if (!Array.isArray(values)) return [];
    const tags = [];
    for (const value of values) {
        const tag = stripTags(value).toLowerCase().replace(/^#+/, '').trim();
        if (!tag || tag.length > 30) continue;
        if (!tags.includes(tag) && tags.length < 12) tags.push(tag);
    }
    return tags;
}

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

/** Gateways return either a string or an array of content parts. */
function readContent(json) {
    const message = json?.choices?.[0]?.message;
    if (typeof message?.content === 'string') return message.content;
    if (Array.isArray(message?.content)) {
        return message.content.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('');
    }
    return '';
}

/** Fenced or prose-wrapped output is common enough to be worth digging out. */
function parseJsonObject(text) {
    const unfenced = String(text || '').replace(/```(?:json)?/gi, '').trim();
    if (!unfenced) return null;

    try {
        const direct = JSON.parse(unfenced);
        if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct;
    } catch { /* fall through to substring scan */ }

    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start === -1 || end <= start) return null;

    try {
        const scanned = JSON.parse(unfenced.slice(start, end + 1));
        return scanned && typeof scanned === 'object' && !Array.isArray(scanned) ? scanned : null;
    } catch {
        return null;
    }
}

const fail = (status, code, error) => ({ status, code, error });

/** Provider failures are translated once, so every exit carries a stable code. */
function providerError(res, result) {
    if (result.status === 401 || result.status === 403) {
        return res.status(502).json({ error: 'The provider rejected the API key.', code: 'provider_auth' });
    }
    if (result.status === 429) {
        return res.status(429).json({
            error: 'The provider is rate limiting us. Wait a moment.',
            code: 'provider_rate_limited',
        });
    }
    if (result.status === 504) {
        return res.status(504).json({ error: 'The provider timed out.', code: 'provider_timeout' });
    }
    return res.status(502).json({
        error: result.message || 'The provider request failed.',
        code: 'provider_error',
    });
}

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

        const cred = await resolveActiveCredential(auth.supabase);
        if (!cred) {
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

        let result = await callChatCompletions(cred, { messages, temperature: 0.4, max_tokens: 700 });
        if (!result.ok) return providerError(res, result);

        let parsed = parseJsonObject(readContent(result.json));

        // Exactly one retry. If a model ignores "JSON only" twice, looping just
        // spends more money on the same answer.
        if (!parsed) {
            result = await callChatCompletions(cred, {
                messages: [
                    ...messages,
                    { role: 'assistant', content: readContent(result.json).slice(0, 2000) },
                    {
                        role: 'user',
                        content:
                            'That was not valid JSON. Reply again with ONE JSON object only — no prose, no code fences.',
                    },
                ],
                temperature: 0,
                max_tokens: 700,
            });
            if (!result.ok) return providerError(res, result);
            parsed = parseJsonObject(readContent(result.json));
        }

        if (!parsed) {
            return res.status(502).json({
                error: 'The model did not return usable JSON. Try again, or switch to a stronger model.',
                code: 'provider_bad_output',
            });
        }

        const { colors, dropped } = snapColorNames(parsed.colors, 6);

        if (cred.source === 'db' && cred.id) {
            await auth.supabase
                .from('ai_credentials')
                .update({ last_used_at: new Date().toISOString() })
                .eq('id', cred.id);
        }

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
            },
        });
    } catch (err) {
        console.error('[ai-product-metadata]', err);
        return res.status(500).json({ error: 'Something went wrong.', code: 'server_error' });
    }
}
