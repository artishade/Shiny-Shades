/**
 * The editable product draft the admin AI chat renders in the transcript.
 *
 * /api/ai-product-draft only generates; this card owns the write. It publishes
 * the same way /admin/products does — watermark on a canvas, upload to
 * Cloudinary, insert through the browser Supabase client under is_admin() RLS —
 * because the watermark needs a canvas that only the browser has.
 *
 * Draft cards stay in the transcript after publishing, so a second click on
 * Publish would insert a duplicate. The status machine freezes the card instead.
 */

import React, { useMemo, useState } from 'react';
import { Link } from '@/lib/routerCompat';
import { Button, Input, Select } from '@/components/ui';
import { Check, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { applyWatermark, loadCustomLogoWmFromLS, loadWmSettings } from '@/lib/watermark';
import { SIMPLE_COLORS } from '@/lib/simpleColors';
import { useCategoryStore, useProductStore } from '@/store';
import type { Product } from '@/types';

export interface ProductDraftData {
    name: string;
    seoTitle: string;
    shortDescription: string;
    description: string;
    tags: string[];
    colors: string[];
    categoryName: string;
    categorySlug: string;
    suggestedCategory: string;
}

export interface ProductDraftMeta {
    model?: string;
    credentialLabel?: string;
    droppedColors?: string[];
    imagesAnalyzed?: number;
    switchedFrom?: string[];
}

const SIZE_PRESETS = [
    { label: 'M–XL', sizes: ['M', 'L', 'XL'] },
    { label: '32-38', sizes: ['32', '34', '36', '38'] },
    { label: 'XS–XXL', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
    { label: 'Free Size', sizes: ['Free Size'] },
    { label: '32–40 (bra/chest)', sizes: ['32', '34', '36', '38', '40'] },
    { label: '28–36 (waist)', sizes: ['28', '30', '32', '34', '36'] },
    { label: 'S–XXL only', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
];

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #F4C2C2, #E6E6FA)';
const FIELD_CLASS =
    'w-full px-3 py-2 rounded-xl border border-blush/30 bg-white/80 text-sm text-charcoal ' +
    'focus:outline-none focus:ring-2 focus:ring-rose-gold/30 resize-none';

const slugify = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Same shape as the products page: two letters from each of the first two words. */
const makeSku = (name: string) => {
    if (!name.trim()) return '';
    const prefix = name.trim().toUpperCase().split(/\s+/).slice(0, 2).map((w) => w.slice(0, 2)).join('');
    return `${prefix}${Math.floor(100 + Math.random() * 900)}`;
};

const swatch = (color: string) => SIMPLE_COLORS[color] || '#D9CFCB';

interface DraftForm {
    name: string;
    seoTitle: string;
    price: string;
    comparePrice: string;
    stock: string;
    sku: string;
    categoryName: string;
    tags: string[];
    colors: string[];
    sizes: string[];
    shortDescription: string;
    description: string;
    isFeatured: boolean;
    isTrending: boolean;
    isNewArrival: boolean;
    isOnSale: boolean;
}

interface ProductDraftCardProps {
    draft: ProductDraftData;
    meta?: ProductDraftMeta;
    /** Full-resolution originals. The model saw compressed copies of these. */
    files: File[];
    /** Whatever the owner typed in the composer, if it parsed as a number. */
    priceHint?: string;
}

type PublishStatus = 'idle' | 'publishing' | 'published' | 'failed';

export const ProductDraftCard: React.FC<ProductDraftCardProps> = ({ draft, meta, files, priceHint }) => {
    const { categories, addCategory } = useCategoryStore();
    const addProduct = useProductStore((s) => s.addProduct);

    const [form, setForm] = useState<DraftForm>(() => ({
        name: draft.name,
        seoTitle: draft.seoTitle,
        price: priceHint || '',
        comparePrice: '',
        stock: '150',
        sku: makeSku(draft.name),
        categoryName: draft.categoryName,
        tags: draft.tags,
        colors: draft.colors,
        sizes: [],
        shortDescription: draft.shortDescription,
        description: draft.description,
        isFeatured: false,
        isTrending: false,
        isNewArrival: true,
        isOnSale: false,
    }));
    const [status, setStatus] = useState<PublishStatus>('idle');
    const [error, setError] = useState('');
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [publishedSlug, setPublishedSlug] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);

    const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
    React.useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

    const categoryOptions = useMemo(
        () => [
            { value: '', label: 'Choose a category…' },
            ...categories.map((c) => ({ value: c.name, label: c.name })),
        ],
        [categories],
    );

    const frozen = status === 'published' || status === 'publishing';
    const set = <K extends keyof DraftForm>(key: K, value: DraftForm[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));

    const addSizes = (sizes: string[]) =>
        setForm((prev) => ({ ...prev, sizes: [...new Set([...prev.sizes, ...sizes])] }));

    /** Only offered when the model could not match an existing category. */
    const createSuggestedCategory = async () => {
        const name = draft.suggestedCategory.trim();
        if (!name || creatingCategory) return;
        setCreatingCategory(true);
        try {
            await addCategory({
                id: crypto.randomUUID(),
                name,
                slug: slugify(name),
                description: '',
                image: '',
                productCount: 0,
                gradient: DEFAULT_GRADIENT,
                parentId: null,
            });
            set('categoryName', name);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create that category.');
        } finally {
            setCreatingCategory(false);
        }
    };
    /**
     * Watermark then upload, one image at a time. Mirrors uploadImages on the
     * products page: the mark is applied once, only the upload is retried, and a
     * failed image is counted rather than aborting the whole publish.
     */
    const uploadImages = async (): Promise<{ urls: string[]; failed: number }> => {
        const wm = loadWmSettings();
        const customLogoWm = loadCustomLogoWmFromLS();
        const urls: string[] = [];
        let failed = 0;

        for (let i = 0; i < files.length; i += 1) {
            setProgress({ done: i, total: files.length });

            let file = files[i];
            if (wm.wmEnabled) {
                try {
                    file = await applyWatermark(files[i], {
                        sizeMultiplier: wm.wmSize,
                        textWm: {
                            enabled: wm.textWmEnabled,
                            text: wm.textWmText,
                            opacity: wm.textWmOpacity,
                            size: wm.textWmSize,
                            angle: wm.textWmAngle,
                            color: wm.textWmColor,
                            spacingX: wm.textWmSpacingX,
                            spacingY: wm.textWmSpacingY,
                        },
                        logoWm: { text: wm.agLogoText, colorLeft: wm.agLogoColorLeft, colorRight: wm.agLogoColorRight },
                        customLogoWm,
                        pos: wm.wmPos,
                    });
                } catch {
                    file = files[i];
                }
            }

            let uploaded = false;
            for (let attempt = 1; attempt <= 3 && !uploaded; attempt += 1) {
                try {
                    const url = await uploadToCloudinary(file);
                    if (url) {
                        urls.push(url);
                        uploaded = true;
                        break;
                    }
                } catch (err) {
                    console.warn(`Upload attempt ${attempt}/3 failed for "${files[i].name}":`, err);
                }
                if (attempt < 3) await new Promise((r) => setTimeout(r, 1500));
            }
            if (!uploaded) failed += 1;

            setProgress({ done: i + 1, total: files.length });
        }

        return { urls, failed };
    };
    const publish = async () => {
        if (status === 'publishing' || status === 'published') return;

        const price = Number(form.price);
        if (!form.name.trim()) return setError('Give the product a name.');
        if (!Number.isFinite(price) || price <= 0) return setError('Set a price above 0.');
        if (!form.categoryName) return setError('Pick a category.');
        if (!files.length) return setError('This draft has no images left to upload.');

        setStatus('publishing');
        setError('');

        try {
            const { urls, failed } = await uploadImages();
            if (!urls.length) throw new Error('Every image failed to upload. Nothing was published.');

            const cat = categories.find((c) => c.name === form.categoryName);
            const slug = `${slugify(form.name)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
            const now = new Date().toISOString();
            const comparePrice = Number(form.comparePrice);
            const tags = form.tags;

            const payload = {
                name: form.name.trim(),
                slug,
                description: form.description.trim() || null,
                short_description: form.shortDescription.trim() || null,
                images: urls,
                video_url: null,
                price,
                compare_price: Number.isFinite(comparePrice) && comparePrice > 0 ? comparePrice : null,
                category_name: form.categoryName,
                category_slug: cat?.slug || draft.categorySlug || '',
                sizes: form.sizes,
                colors: form.colors,
                stock: Number(form.stock) || 0,
                sku: form.sku.trim() || null,
                tags,
                seo_title: form.seoTitle.trim() || null,
                seo_keywords: tags.join(', ') || null,
                custom_text: '',
                is_featured: form.isFeatured,
                is_trending: form.isTrending,
                is_new_arrival: form.isNewArrival,
                is_on_sale: form.isOnSale,
                updated_at: now,
            };
            const { data, error: insertError } = await supabase
                .from('products')
                .insert([{ ...payload, is_active: true, rating: 0, review_count: 0, created_at: now }])
                .select();
            if (insertError) throw insertError;

            // The store caches for 5 minutes once hasFetched is true, so without
            // this the new product would not appear until the cache expired.
            addProduct({
                id: data[0].id,
                name: payload.name,
                slug,
                description: form.description,
                shortDescription: form.shortDescription,
                price,
                comparePrice: payload.compare_price ?? undefined,
                images: urls,
                category: form.categoryName,
                categorySlug: payload.category_slug,
                sizes: form.sizes,
                colors: form.colors,
                stock: Number(form.stock) || 0,
                sku: form.sku,
                tags,
                seoTitle: form.seoTitle,
                seoKeywords: tags.join(', '),
                customText: '',
                isFeatured: form.isFeatured,
                isTrending: form.isTrending,
                isNewArrival: form.isNewArrival,
                isOnSale: form.isOnSale,
                rating: 0,
                reviewCount: 0,
                createdAt: now,
                updatedAt: now,
            } as unknown as Product);

            setPublishedSlug(slug);
            setStatus('published');
            setError(
                failed > 0
                    ? `Published, but ${failed} image(s) failed to upload. Add them from the products page.`
                    : '',
            );
        } catch (err) {
            console.error('[ProductDraftCard] publish failed:', err);
            setStatus('failed');
            setError(err instanceof Error ? err.message : 'Publishing failed. Nothing was saved.');
        } finally {
            setProgress(null);
        }
    };
    return (
        <div className="glass-card rounded-2xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-charcoal">
                        <Sparkles size={14} className="text-rose-gold" /> Product draft
                    </p>
                    <p className="text-[11px] text-[#6B5B55]/80 mt-0.5">
                        {meta?.model}
                        {meta?.credentialLabel && ` · ${meta.credentialLabel}`}
                        {!!meta?.imagesAnalyzed && ` · ${meta.imagesAnalyzed} photo(s) read`}
                        {!!meta?.switchedFrom?.length && ` · switched after ${meta.switchedFrom.join(', ')} failed`}
                    </p>
                    {!!meta?.droppedColors?.length && (
                        <p className="text-[11px] text-[#6B5B55]/80">
                            Ignored unknown colors: {meta.droppedColors.join(', ')}
                        </p>
                    )}
                </div>
                {status === 'published' && (
                    <span className="flex items-center gap-1 text-xs text-green-700 font-medium shrink-0">
                        <Check size={14} /> Published
                    </span>
                )}
            </div>

            {previews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {previews.map((url, index) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            key={url}
                            src={url}
                            alt={`Draft photo ${index + 1}`}
                            className="w-16 h-20 object-cover rounded-lg border border-blush/30"
                        />
                    ))}
                </div>
            )}
            <div className="space-y-3">
                <Input
                    label="Product name"
                    value={form.name}
                    disabled={frozen}
                    onChange={(e) => set('name', e.target.value)}
                    className="py-2 text-sm"
                />
                <Input
                    label="SEO title"
                    value={form.seoTitle}
                    disabled={frozen}
                    onChange={(e) => set('seoTitle', e.target.value)}
                    className="py-2 text-sm"
                />

                <div className="grid grid-cols-2 gap-3">
                    <Input
                        label="Price (BDT)"
                        type="number"
                        min={0}
                        value={form.price}
                        disabled={frozen}
                        onChange={(e) => set('price', e.target.value)}
                        className="py-2 text-sm"
                    />
                    <Input
                        label="Compare price"
                        type="number"
                        min={0}
                        value={form.comparePrice}
                        disabled={frozen}
                        onChange={(e) => set('comparePrice', e.target.value)}
                        className="py-2 text-sm"
                    />
                    <Input
                        label="Stock"
                        type="number"
                        min={0}
                        value={form.stock}
                        disabled={frozen}
                        onChange={(e) => set('stock', e.target.value)}
                        className="py-2 text-sm"
                    />
                    <Input
                        label="SKU"
                        value={form.sku}
                        disabled={frozen}
                        onChange={(e) => set('sku', e.target.value)}
                        className="py-2 text-sm"
                    />
                </div>
                <div>
                    <Select
                        label="Category"
                        options={categoryOptions}
                        value={form.categoryName}
                        disabled={frozen}
                        onChange={(e) => set('categoryName', e.target.value)}
                        className="py-2 text-sm"
                    />
                    {!form.categoryName && !!draft.suggestedCategory && (
                        <button
                            type="button"
                            disabled={creatingCategory || frozen}
                            onClick={createSuggestedCategory}
                            className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full border border-rose-gold/30 bg-rose-gold/10 text-xs text-rose-gold hover:bg-rose-gold/20 transition-colors disabled:opacity-50"
                        >
                            {creatingCategory ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                            Create category “{draft.suggestedCategory}”
                        </button>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-medium text-[#6B5B55] mb-1.5">
                        SEO keywords / tags (comma separated)
                    </label>
                    <input
                        value={form.tags.join(', ')}
                        disabled={frozen}
                        onChange={(e) =>
                            set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))
                        }
                        className={FIELD_CLASS}
                    />
                </div>

                {form.colors.length > 0 && (
                    <div>
                        <label className="block text-xs font-medium text-[#6B5B55] mb-1.5">Colors</label>
                        <div className="flex flex-wrap gap-2">
                            {form.colors.map((color) => (
                                <div
                                    key={color}
                                    className="flex items-center gap-1.5 bg-white border border-blush/20 rounded-full px-3 py-1.5 shadow-sm"
                                >
                                    <div
                                        className="w-4 h-4 rounded-full border border-gray-200 shadow-sm flex-shrink-0"
                                        style={{ backgroundColor: swatch(color) }}
                                    />
                                    <span className="text-xs text-charcoal font-medium">{color}</span>
                                    {!frozen && (
                                        <button
                                            type="button"
                                            onClick={() => set('colors', form.colors.filter((c) => c !== color))}
                                            className="text-[#6B5B55] hover:text-red-500 ml-0.5 transition-colors"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div>
                    <label className="block text-xs font-medium text-[#6B5B55] mb-0.5">Sizes</label>
                    <p className="text-[11px] text-[#6B5B55]/80 mb-2">
                        A photo cannot show what you stock, so pick these yourself.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {SIZE_PRESETS.map((preset) => (
                            <button
                                key={preset.label}
                                type="button"
                                disabled={frozen}
                                onClick={() => addSizes(preset.sizes)}
                                className="text-xs px-2.5 py-1 rounded-lg bg-blush-light/60 text-[#6B5B55] hover:bg-blush-light transition-colors border border-blush/20 disabled:opacity-50"
                            >
                                + {preset.label}
                            </button>
                        ))}
                    </div>
                    {form.sizes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {form.sizes.map((size) => (
                                <div
                                    key={size}
                                    className="flex items-center gap-1 bg-rose-gold/10 text-rose-gold rounded-full px-3 py-1 border border-rose-gold/20"
                                >
                                    <span className="text-xs font-medium">{size}</span>
                                    {!frozen && (
                                        <button
                                            type="button"
                                            onClick={() => set('sizes', form.sizes.filter((s) => s !== size))}
                                            className="hover:text-red-500 ml-1 transition-colors"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-medium text-[#6B5B55] mb-1.5">Short description</label>
                    <textarea
                        rows={2}
                        value={form.shortDescription}
                        disabled={frozen}
                        onChange={(e) => set('shortDescription', e.target.value)}
                        className={FIELD_CLASS}
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-[#6B5B55] mb-1.5">Full description</label>
                    <textarea
                        rows={4}
                        value={form.description}
                        disabled={frozen}
                        onChange={(e) => set('description', e.target.value)}
                        className={FIELD_CLASS}
                    />
                </div>

                <div className="flex flex-wrap gap-4">
                    {(['isFeatured', 'isTrending', 'isNewArrival', 'isOnSale'] as const).map((key) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={form[key]}
                                disabled={frozen}
                                onChange={(e) => set(key, e.target.checked)}
                                className="w-4 h-4 rounded accent-rose-gold"
                            />
                            <span className="text-xs text-charcoal">
                                {key.replace('is', '').replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                        </label>
                    ))}
                </div>
            </div>
            {progress && (
                <div>
                    <div className="flex justify-between text-[11px] text-[#6B5B55] mb-1">
                        <span>Watermarking and uploading…</span>
                        <span>
                            {progress.done} / {progress.total}
                        </span>
                    </div>
                    <div className="w-full bg-blush/20 rounded-full h-1.5">
                        <div
                            className="bg-rose-gold h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${(progress.done / progress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {error && (
                <p className={`text-xs ${status === 'published' ? 'text-amber-700' : 'text-red-600'}`}>{error}</p>
            )}

            {status === 'published' ? (
                <p className="text-xs text-[#6B5B55]">
                    Live on the store —{' '}
                    <Link to={`/product/${publishedSlug}`} className="underline font-medium text-rose-gold">
                        view product
                    </Link>
                </p>
            ) : (
                <div className="flex justify-end">
                    <Button size="sm" onClick={publish} loading={status === 'publishing'} disabled={frozen}>
                        {status === 'failed' ? 'Retry publish' : 'Publish to store'}
                    </Button>
                </div>
            )}
        </div>
    );
};
