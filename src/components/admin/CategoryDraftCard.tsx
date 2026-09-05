/**
 * The editable category draft the admin AI chat renders in the transcript.
 *
 * /api/ai-category-draft only ever returns "create" or "update", so this card
 * has no delete path — the route cannot ask for one and the store call is chosen
 * from `action`, not from anything the model wrote.
 *
 * Like the product card it freezes after a successful Apply, because the draft
 * stays in the transcript and a second click would insert a duplicate row.
 */

import React, { useMemo, useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { Check, FolderTree } from 'lucide-react';
import { useCategoryStore } from '@/store';

export interface CategoryDraftData {
    action: 'create' | 'update';
    targetId: string;
    targetSlug: string;
    name: string;
    description: string;
    parentId: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
}

export interface CategoryDraftMeta {
    model?: string;
    credentialLabel?: string;
    switchedFrom?: string[];
}

const GRADIENTS = [
    'linear-gradient(135deg, #F4C2C2, #E6E6FA)',
    'linear-gradient(135deg, #F7E7CE, #F4C2C2)',
    'linear-gradient(135deg, #E3BCA4, #FADBD8)',
    'linear-gradient(135deg, #B76E79, #F4C2C2)',
    'linear-gradient(135deg, #D4949E, #E6E6FA)',
    'linear-gradient(135deg, #FADBD8, #F7E7CE)',
    'linear-gradient(135deg, #C8C8E0, #E3BCA4)',
];

const FIELD_CLASS =
    'w-full px-3 py-2 rounded-xl border border-blush/30 bg-white/80 text-sm text-charcoal ' +
    'focus:outline-none focus:ring-2 focus:ring-rose-gold/30 resize-none';

const slugify = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

interface CategoryDraftCardProps {
    draft: CategoryDraftData;
    meta?: CategoryDraftMeta;
}

type ApplyStatus = 'idle' | 'saving' | 'saved' | 'failed';

export const CategoryDraftCard: React.FC<CategoryDraftCardProps> = ({ draft, meta }) => {
    const { categories, addCategory, updateCategory } = useCategoryStore();

    const existing = useMemo(
        () => (draft.targetId ? categories.find((c) => c.id === draft.targetId) || null : null),
        [categories, draft.targetId],
    );

    const [form, setForm] = useState(() => ({
        name: draft.name,
        description: draft.description,
        parentId: draft.parentId,
        gradient: existing?.gradient || GRADIENTS[0],
        seoTitle: draft.seoTitle,
        seoDescription: draft.seoDescription,
        seoKeywords: draft.seoKeywords,
    }));
    const [status, setStatus] = useState<ApplyStatus>('idle');
    const [error, setError] = useState('');

    // The route only resolves a target that exists, so a stale id means the row
    // was removed since the draft was generated — creating is the honest fallback.
    const isUpdate = draft.action === 'update' && !!existing;
    const frozen = status === 'saving' || status === 'saved';

    const parentOptions = useMemo(
        () => [
            { value: '', label: 'No parent (top level)' },
            ...categories
                .filter((c) => c.id !== draft.targetId)
                .map((c) => ({ value: c.id, label: c.name })),
        ],
        [categories, draft.targetId],
    );

    const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }));
    const apply = async () => {
        if (frozen) return;
        if (!form.name.trim()) return setError('Give the category a name.');

        setStatus('saving');
        setError('');

        const shared = {
            name: form.name.trim(),
            slug: slugify(form.name),
            description: form.description.trim(),
            gradient: form.gradient,
            parentId: form.parentId || null,
            seoTitle: form.seoTitle.trim(),
            seoDescription: form.seoDescription.trim(),
            seoKeywords: form.seoKeywords.trim(),
        };

        try {
            if (isUpdate) {
                await updateCategory(existing!.id, { ...shared, image: existing!.image });
            } else {
                await addCategory({
                    ...shared,
                    id: crypto.randomUUID(),
                    image: '',
                    productCount: 0,
                });
            }
            setStatus('saved');
        } catch (err) {
            console.error('[CategoryDraftCard] apply failed:', err);
            setStatus('failed');
            setError(err instanceof Error ? err.message : 'Save failed — check Supabase permissions.');
        }
    };
    return (
        <div className="glass-card rounded-2xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-charcoal">
                        <FolderTree size={14} className="text-rose-gold" />
                        {isUpdate ? `Editing “${existing!.name}”` : 'New category'}
                    </p>
                    <p className="text-[11px] text-[#6B5B55]/80 mt-0.5">
                        {meta?.model}
                        {meta?.credentialLabel && ` · ${meta.credentialLabel}`}
                        {!!meta?.switchedFrom?.length && ` · switched after ${meta.switchedFrom.join(', ')} failed`}
                    </p>
                </div>
                {status === 'saved' && (
                    <span className="flex items-center gap-1 text-xs text-green-700 font-medium shrink-0">
                        <Check size={14} /> Saved
                    </span>
                )}
            </div>

            <div className="space-y-3">
                <Input
                    label="Name"
                    value={form.name}
                    disabled={frozen}
                    onChange={(e) => set('name', e.target.value)}
                    className="py-2 text-sm"
                />
                <p className="text-[11px] text-[#6B5B55]/80 -mt-2">Slug: /category/{slugify(form.name) || '…'}</p>

                <div>
                    <label className="block text-xs font-medium text-[#6B5B55] mb-1.5">Description</label>
                    <textarea
                        rows={2}
                        value={form.description}
                        disabled={frozen}
                        onChange={(e) => set('description', e.target.value)}
                        className={FIELD_CLASS}
                    />
                </div>

                <Select
                    label="Parent category"
                    options={parentOptions}
                    value={form.parentId}
                    disabled={frozen}
                    onChange={(e) => set('parentId', e.target.value)}
                    className="py-2 text-sm"
                />
                <div>
                    <label className="block text-xs font-medium text-[#6B5B55] mb-1.5">Card gradient</label>
                    <div className="flex flex-wrap gap-2">
                        {GRADIENTS.map((gradient) => (
                            <button
                                key={gradient}
                                type="button"
                                disabled={frozen}
                                onClick={() => set('gradient', gradient)}
                                aria-label="Choose gradient"
                                aria-pressed={form.gradient === gradient}
                                style={{ background: gradient }}
                                className={`w-9 h-9 rounded-lg border-2 transition-all disabled:opacity-50 ${
                                    form.gradient === gradient ? 'border-rose-gold scale-105' : 'border-transparent'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                <Input
                    label="SEO title"
                    value={form.seoTitle}
                    disabled={frozen}
                    onChange={(e) => set('seoTitle', e.target.value)}
                    className="py-2 text-sm"
                />
                <div>
                    <label className="block text-xs font-medium text-[#6B5B55] mb-1.5">SEO description</label>
                    <textarea
                        rows={2}
                        value={form.seoDescription}
                        disabled={frozen}
                        onChange={(e) => set('seoDescription', e.target.value)}
                        className={FIELD_CLASS}
                    />
                </div>
                <Input
                    label="SEO keywords"
                    value={form.seoKeywords}
                    disabled={frozen}
                    onChange={(e) => set('seoKeywords', e.target.value)}
                    className="py-2 text-sm"
                />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}

            {status === 'saved' ? (
                <p className="text-xs text-[#6B5B55]">
                    {isUpdate ? 'Category updated.' : 'Category created.'} It is live on the store now.
                </p>
            ) : (
                <div className="flex justify-end">
                    <Button size="sm" onClick={apply} loading={status === 'saving'} disabled={frozen}>
                        {status === 'failed' ? 'Retry' : isUpdate ? 'Apply changes' : 'Create category'}
                    </Button>
                </div>
            )}
        </div>
    );
};
