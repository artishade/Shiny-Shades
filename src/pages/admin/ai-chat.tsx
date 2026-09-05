/* ===================================================
   - Admin AI Chat (store-data analyst)

   History lives in React state only — reloading clears it. Every turn posts
   the whole visible conversation to /api/ai-chat, which rebuilds the store
   digest server-side; nothing about the store is computed in the browser.

   Assistant text is rendered as a plain text child. Model output is untrusted,
   so there is no markdown renderer and no dangerouslySetInnerHTML here.
   =================================================== */

import React, { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { AdminAuthLayout } from '@/components/layout/AdminAuthLayout';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { Send, Sparkles, Trash2 } from 'lucide-react';
import type { NextPageWithLayout } from '@/types/layout';

interface ChatMeta {
  model?: string;
  historyTrimmed?: number;
  ordersCovered?: number;
  ordersTotal?: number;
  totalTokens?: number;
  switchedFrom?: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  meta?: ChatMeta;
}

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

const Bubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const meta = message.meta;

  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
          isUser ? 'bg-rose-gold text-white' : 'glass-card text-charcoal'
        }`}
      >
        {message.content}
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || sending) return;

      const history: ChatMessage[] = [...messages, { role: 'user', content: question }];
      setMessages(history);
      setInput('');
      setError('');
      setSending(true);

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error('Session expired. Sign in again.');

        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messages: history.map(({ role, content }) => ({ role, content })),
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);

        setMessages([...history, { role: 'assistant', content: json.reply, meta: json.meta }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not reach the assistant.');
      } finally {
        setSending(false);
      }
    },
    [messages, sending],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Bengali IME input fires keydown mid-composition; sending there cuts words.
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="heading-serif text-2xl md:text-3xl font-bold text-charcoal">AI Chat</h1>
          <p className="text-[#6B5B55] text-sm">
            Ask about orders, revenue, stock and catalogue gaps
          </p>
          <p className="text-[#6B5B55]/70 text-xs mt-1">
            This conversation is not saved — reloading the page clears it.
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMessages([]);
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

      {messages.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Sparkles size={28} className="mx-auto text-rose-gold mb-3" />
          <h3 className="heading-serif text-xl font-semibold text-charcoal mb-2">
            Ask about your store
          </h3>
          <p className="text-[#6B5B55] text-sm mb-5 max-w-lg mx-auto">
            It reads your orders, products, categories and coupons. It cannot see visitors, page
            views or ad performance — this site does not record any of that.
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
          {messages.map((message, index) => (
            <Bubble key={`${index}-${message.role}`} message={message} />
          ))}
          {sending && (
            <div className="glass-card rounded-2xl px-4 py-2.5 text-sm text-[#6B5B55] animate-pulse w-fit">
              Reading your store data…
            </div>
          )}
        </div>
      )}

      <div ref={bottomRef} />

      <div className="sticky bottom-0 mt-4 pt-4 pb-2 bg-soft-bg/90 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <textarea
            id="ai-chat-input"
            className={COMPOSER_CLASS}
            rows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about orders, revenue, stock…"
          />
          <Button onClick={() => send(input)} loading={sending} disabled={!input.trim()}>
            <Send size={16} />
          </Button>
        </div>
        <p className="text-[11px] text-[#6B5B55]/70 mt-1.5">
          Enter sends, Shift+Enter starts a new line.
        </p>
      </div>
    </div>
  );
};

AdminAiChatPage.getLayout = function getLayout(page: ReactElement) {
  return <AdminAuthLayout>{page}</AdminAuthLayout>;
};

export default AdminAiChatPage;
