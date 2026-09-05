/* ===================================================
   - Admin AI Chat (store analyst + catalog drafting)

   History lives in React state only — reloading clears it. Text turns post the
   whole visible conversation to /api/ai-chat, which rebuilds the store digest
   server-side; nothing about the store is computed in the browser.

   Attaching photos switches the turn to /api/ai-product-draft, and the Category
   chip to /api/ai-category-draft. Both are generate-only: the reply is an
   editable card, and the write happens from the card on an explicit click.

   Photos can be dropped anywhere on the page as well as picked from the
   composer; both paths go through addFiles, so the cap is enforced once.

   Assistant text is rendered as a plain text child. Model output is untrusted,
   so there is no markdown renderer and no dangerouslySetInnerHTML here.
   =================================================== */

import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { AdminAuthLayout } from '@/components/layout/AdminAuthLayout';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { ImagePlus, Send, Sparkles, Trash2, UploadCloud, X } from 'lucide-react';
import {
  ProductDraftCard,
  type ProductDraftData,
  type ProductDraftMeta,
} from '@/components/admin/ProductDraftCard';
import {
  CategoryDraftCard,
  type CategoryDraftData,
  type CategoryDraftMeta,
} from '@/components/admin/CategoryDraftCard';
import { useCategoryStore } from '@/store';
import type { NextPageWithLayout } from '@/types/layout';

interface ChatMeta {
  model?: string;
  historyTrimmed?: number;
  ordersCovered?: number;
  ordersTotal?: number;
  totalTokens?: number;
  switchedFrom?: string[];
}

type TranscriptItem =
  | { id: string; kind: 'user'; content: string }
  | { id: string; kind: 'assistant'; content: string; meta?: ChatMeta }
  | {
      id: string;
      kind: 'productDraft';
      draft: ProductDraftData;
      meta?: ProductDraftMeta;
      files: File[];
      priceHint: string;
    }
  | { id: string; kind: 'categoryDraft'; draft: CategoryDraftData; meta?: CategoryDraftMeta };

const MAX_ATTACHMENTS = 8;
/** Matches MAX_IMAGES in /api/ai-product-draft. Extra photos still publish. */
const MODEL_IMAGES_PER_DRAFT = 4;
const COVER_OPTS = { maxSizeMB: 0.35, maxWidthOrHeight: 1024 };
const EXTRA_OPTS = { maxSizeMB: 0.12, maxWidthOrHeight: 640 };

/** These abort a bulk loop — neither resolves itself between photos. */
const FATAL_CODES = ['rate_limited', 'daily_limit', 'no_credentials'];

const SUGGESTIONS = [
  'How many orders came in today and this week?',
  'Which products are out of stock or below 10 units?',
  'Top 5 products by revenue in the last 30 days',
  'Which coupons are actually being used?',
];

const COMPOSER_CLASS =
  'w-full px-4 py-2.5 rounded-xl border border-blush/30 bg-white/80 text-charcoal ' +
  'placeholder:text-[#6B5B55]/50 transition-all duration-200 focus:outline-none ' +
  'focus:ring-2 focus:ring-rose-gold/30 focus:border-rose-gold resize-none';

const CHIP_BASE = 'px-3 py-1 rounded-full text-xs border transition-colors disabled:opacity-40';
const CHIP_ON = 'border-rose-gold bg-rose-gold text-white';
const CHIP_OFF = 'border-blush/40 bg-white/70 text-charcoal hover:bg-blush-light';

const uid = () => Math.random().toString(36).slice(2, 10);

/** The owner types "Party saree 1850" — take the first plausible amount. */
const readPriceHint = (text: string) => text.match(/\b(\d{2,7})\b/)?.[1] || '';

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.readAsDataURL(file);
  });

/**
 * Un-watermarked bytes go to the model on purpose: the tiled 0.18-opacity text
 * washes out exactly the colour and fabric detail it is being asked to read. The
 * watermark is applied separately, at publish time, from the originals.
 */
const prepareForModel = async (files: File[]) => {
  const { default: imageCompression } = await import('browser-image-compression');
  const out: string[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const opts = i === 0 ? COVER_OPTS : EXTRA_OPTS;
    const small = await imageCompression(files[i], { ...opts, fileType: 'image/webp', useWebWorker: false });
    out.push(await toDataUrl(small));
  }
  return out;
};

const postJson = async (url: string, body: unknown) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Session expired. Sign in again.');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error || `Request failed (${res.status})`) as Error & { code?: string };
    err.code = json?.code;
    throw err;
  }
  return json;
};

const Bubble: React.FC<{ role: 'user' | 'assistant'; content: string; meta?: ChatMeta }> = ({
  role,
  content,
  meta,
}) => {
  const isUser = role === 'user';

  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
          isUser ? 'bg-rose-gold text-white' : 'glass-card text-charcoal'
        }`}
      >
        {content}
        {meta && (
          <span className="block mt-2 text-[11px] text-[#6B5B55]/70">
            {meta.model}
            {meta.ordersCovered !== undefined && ` · ${meta.ordersCovered} of ${meta.ordersTotal} orders read`}
            {!!meta.totalTokens && ` · ${meta.totalTokens} tokens`}
            {!!meta.historyTrimmed && ' · earlier messages omitted for length'}
            {!!meta.switchedFrom?.length && ` · switched after ${meta.switchedFrom.join(', ')} failed`}
          </span>
        )}
      </div>
    </div>
  );
};
const AdminAiChatPage: NextPageWithLayout = () => {
  const loadCategories = useCategoryStore((s) => s.loadCategories);

  const [items, setItems] = useState<TranscriptItem[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [intent, setIntent] = useState<'ask' | 'category'>('ask');
  const [sending, setSending] = useState(false);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const [pendingLabel, setPendingLabel] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // dragenter/dragleave fire once per element the cursor crosses, so the overlay
  // is driven by a depth counter rather than by the raw events.
  const dragDepth = useRef(0);

  // The draft cards need the category list, and this page never loaded it.
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [items, sending]);

  const thumbs = useMemo(() => attachments.map((file) => URL.createObjectURL(file)), [attachments]);
  useEffect(() => () => thumbs.forEach((url) => URL.revokeObjectURL(url)), [thumbs]);

  const hasImages = attachments.length > 0;

  /**
   * The one place attachments are added, from either the picker or a drop.
   * A dropped non-image is called out instead of silently skipped, because a
   * dropped PDF is otherwise indistinguishable from the page ignoring the drop.
   */
  const addFiles = useCallback(
    (incoming: File[]) => {
      if (!incoming.length) return;

      const images = incoming.filter((file) => file.type.startsWith('image/'));
      if (!images.length) {
        setError('Only image files can be attached.');
        return;
      }

      const next = [...attachments, ...images];
      setError(
        next.length > MAX_ATTACHMENTS
          ? `At most ${MAX_ATTACHMENTS} photos per message — the extras were dropped.`
          : '',
      );
      setAttachments(next.slice(0, MAX_ATTACHMENTS));
    },
    [attachments],
  );

  const pickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || []);
    // Cleared so re-picking the same photo still fires change.
    event.target.value = '';
    addFiles(picked);
  };

  /**
   * The drop target is the whole window, not a box: a fixed zone would sit under
   * a long transcript or fight the sticky composer. Cancelling dragover is what
   * makes the drop fire at all — left alone, the browser opens the dropped file
   * and the transcript, which lives in React state only, is gone.
   */
  useEffect(() => {
    const carriesFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types || []).includes('Files');

    const onDragEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      dragDepth.current += 1;
      setDragActive(true);
    };

    const onDragOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };

    const onDragLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setDragActive(false);
    };

    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragActive(false);
      // Refused mid-run rather than queued: the bulk loop reassigns attachments
      // when it aborts, which would throw these photos away without a word.
      if (sending) {
        setError('Still working on the last message. Wait for it to finish, then drop the photos.');
        return;
      }
      addFiles(Array.from(event.dataTransfer?.files || []));
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [addFiles, sending]);

  const runAsk = async (history: TranscriptItem[]) => {
    const json = await postJson('/api/ai-chat', {
      messages: history
        .filter((item) => item.kind === 'user' || item.kind === 'assistant')
        .map((item) => ({ role: item.kind, content: 'content' in item ? item.content : '' })),
    });
    setItems((prev) => [...prev, { id: uid(), kind: 'assistant', content: json.reply, meta: json.meta }]);
  };

  const runCategory = async (instruction: string) => {
    const json = await postJson('/api/ai-category-draft', { instruction });
    setItems((prev) => [...prev, { id: uid(), kind: 'categoryDraft', draft: json.data, meta: json.meta }]);
  };

  /**
   * One request per product, sequentially. A server-side loop would blow past
   * maxDuration and lose every draft after the tokens were already paid for;
   * this way each photo fails on its own and the owner can edit draft 1 while
   * draft 4 is still generating.
   */
  const runProduct = async (text: string, files: File[], bulk: boolean) => {
    const priceHint = readPriceHint(text);
    const groups = bulk ? files.map((file) => [file]) : [files];

    for (let i = 0; i < groups.length; i += 1) {
      const group = groups[i];
      if (groups.length > 1) setBatch({ done: i, total: groups.length });

      try {
        const images = await prepareForModel(group.slice(0, MODEL_IMAGES_PER_DRAFT));
        const json = await postJson('/api/ai-product-draft', { images, priceHint, notes: text });
        setItems((prev) => [
          ...prev,
          { id: uid(), kind: 'productDraft', draft: json.data, meta: json.meta, files: group, priceHint },
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Drafting failed.';
        const code = (err as { code?: string }).code || '';
        setItems((prev) => [
          ...prev,
          {
            id: uid(),
            kind: 'assistant',
            content: groups.length > 1 ? `Photo ${i + 1}: ${message}` : message,
          },
        ]);
        // Drafts already in the transcript are kept, and the photos that never
        // got their turn go back on the composer so they are not lost.
        if (FATAL_CODES.includes(code)) {
          if (bulk) setAttachments(files.slice(i + 1));
          break;
        }
      }
    }
    setBatch(null);
  };

  const send = useCallback(
    async (override?: string) => {
      if (sending) return;

      const text = (override ?? input).trim();
      const files = attachments;
      if (!text && !files.length) return;

      const label = text || `${files.length} photo${files.length > 1 ? 's' : ''} attached`;
      const history: TranscriptItem[] = [...items, { id: uid(), kind: 'user', content: label }];
      setItems(history);
      setInput('');
      setAttachments([]);
      setError('');
      setSending(true);
      setPendingLabel(
        files.length
          ? 'Reading your photos…'
          : intent === 'category'
            ? 'Drafting the category…'
            : 'Reading your store data…',
      );

      try {
        if (files.length) await runProduct(text, files, mode === 'bulk');
        else if (intent === 'category') await runCategory(text);
        else await runAsk(history);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not reach the assistant.');
      } finally {
        setSending(false);
        setBatch(null);
      }
    },
    [attachments, input, intent, items, mode, sending],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Bengali IME input fires keydown mid-composition; sending there cuts words.
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const pending = batch && batch.total > 1 ? `Reading photo ${batch.done + 1} of ${batch.total}…` : pendingLabel;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="heading-serif text-2xl md:text-3xl font-bold text-charcoal">AI Chat</h1>
          <p className="text-[#6B5B55] text-sm">
            Ask about orders and stock, or attach photos to draft a product
          </p>
          <p className="text-[#6B5B55]/70 text-xs mt-1">
            This conversation is not saved — reloading the page clears it.
          </p>
        </div>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setItems([]);
              setError('');
            }}
          >
            <Trash2 size={14} /> Clear chat
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Sparkles size={28} className="mx-auto text-rose-gold mb-3" />
          <h3 className="heading-serif text-xl font-semibold text-charcoal mb-2">
            Ask, or draft a product
          </h3>
          <p className="text-[#6B5B55] text-sm mb-5 max-w-lg mx-auto">
            It reads your orders, products, categories and coupons. Attach photos — or drop them
            anywhere on this page — with a price to get a full catalog draft you can edit and publish
            from here.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => send(suggestion)}
                className="px-3 py-1.5 rounded-full border border-blush/40 bg-white/70 text-xs text-charcoal hover:bg-blush-light transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            if (item.kind === 'productDraft') {
              return (
                <ProductDraftCard
                  key={item.id}
                  draft={item.draft}
                  meta={item.meta}
                  files={item.files}
                  priceHint={item.priceHint}
                />
              );
            }
            if (item.kind === 'categoryDraft') {
              return <CategoryDraftCard key={item.id} draft={item.draft} meta={item.meta} />;
            }
            return (
              <Bubble
                key={item.id}
                role={item.kind}
                content={item.content}
                meta={item.kind === 'assistant' ? item.meta : undefined}
              />
            );
          })}
          {sending && (
            <div className="glass-card rounded-2xl px-4 py-2.5 text-sm text-[#6B5B55] animate-pulse w-fit">
              {pending}
            </div>
          )}
        </div>
      )}

      <div ref={bottomRef} />
      <div className="sticky bottom-0 mt-4 pt-4 pb-2 bg-soft-bg/90 backdrop-blur-sm">
        {hasImages && (
          <div className="flex flex-wrap gap-2 mb-2">
            {thumbs.map((url, index) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Attachment ${index + 1}`}
                  className="w-14 h-16 object-cover rounded-lg border border-blush/30"
                />
                <button
                  type="button"
                  onClick={() => setAttachments(attachments.filter((_, i) => i !== index))}
                  disabled={sending}
                  aria-label={`Remove attachment ${index + 1}`}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-blush/40 flex items-center justify-center text-[#6B5B55] hover:text-red-500 disabled:opacity-40"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button
            type="button"
            disabled={hasImages || sending}
            onClick={() => setIntent('ask')}
            className={`${CHIP_BASE} ${!hasImages && intent === 'ask' ? CHIP_ON : CHIP_OFF}`}
          >
            Ask
          </button>
          <button
            type="button"
            disabled={hasImages || sending}
            onClick={() => setIntent('category')}
            className={`${CHIP_BASE} ${!hasImages && intent === 'category' ? CHIP_ON : CHIP_OFF}`}
          >
            Category
          </button>

          <span className="w-px h-5 bg-blush/40" />

          {hasImages ? (
            <>
              <button
                type="button"
                disabled={sending}
                onClick={() => setMode('single')}
                className={`${CHIP_BASE} ${mode === 'single' ? CHIP_ON : CHIP_OFF}`}
              >
                1 product
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => setMode('bulk')}
                className={`${CHIP_BASE} ${mode === 'bulk' ? CHIP_ON : CHIP_OFF}`}
              >
                Bulk · {attachments.length} products
              </button>
            </>
          ) : (
            <span className="text-[11px] text-[#6B5B55]/70">Attach or drop photos to draft a product</span>
          )}
        </div>
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={pickFiles}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={sending || attachments.length >= MAX_ATTACHMENTS}
            aria-label="Attach product photos"
          >
            <ImagePlus size={16} />
          </Button>
          <textarea
            id="ai-chat-input"
            className={COMPOSER_CLASS}
            rows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              hasImages
                ? 'Price and any details — e.g. "Party saree 1850, georgette"'
                : intent === 'category'
                  ? 'e.g. "new category Party Sarees" or "rewrite the shirts description"'
                  : 'Ask about orders, revenue, stock…'
            }
          />
          <Button onClick={() => send()} loading={sending} disabled={!input.trim() && !hasImages}>
            <Send size={16} />
          </Button>
        </div>
        <p className="text-[11px] text-[#6B5B55]/70 mt-1.5">
          Enter sends, Shift+Enter starts a new line. Nothing is written to the store until you press
          Publish on a draft.
        </p>
      </div>

      {/* Drag feedback only — pointer-events-none keeps the drag events reaching
          the page underneath, where the window listeners pick them up. */}
      {dragActive && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none">
          <div className="absolute inset-0 bg-charcoal/25 backdrop-blur-sm" />
          <div className="relative max-w-xs animate-scale-in rounded-2xl border-2 border-dashed border-rose-gold bg-white/95 px-8 py-7 text-center shadow-2xl">
            <UploadCloud size={38} className="mx-auto mb-3 text-rose-gold" />
            <p className="text-sm font-medium text-charcoal">
              {sending ? 'A message is still running' : 'Drop photos to draft a product'}
            </p>
            <p className="mt-1 text-xs text-[#6B5B55]">
              {sending
                ? 'Wait for it to finish, then drop them.'
                : `Images only · up to ${MAX_ATTACHMENTS} per message`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

AdminAiChatPage.getLayout = function getLayout(page: ReactElement) {
  return <AdminAuthLayout>{page}</AdminAuthLayout>;
};

export default AdminAiChatPage;
