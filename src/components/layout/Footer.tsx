/* ===================================================
   Shiny Shades - Elegant Footer (Minimal Layout)
   =================================================== */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/config/brandingConfig';
import { CONTACT } from '@/config/contactConfig';
import { SITE } from '@/config/siteConfig';

// ===================================================
// TYPES
// ===================================================

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  setCategories: (categories: Category[]) => void;
}

// ===================================================
// SUPABASE-BACKED ZUSTAND STORE
// Global singleton — all components share the same
// fetched state, so one tab re-fetch updates all.
// (UNCHANGED — do not touch this logic)
// ===================================================

const useSupabaseCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug')
      .order('name', { ascending: true });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    set({ categories: data ?? [], loading: false });
  },

  setCategories: (categories: Category[]) => set({ categories }),
}));

// ===================================================
// HOOK — fetch on mount + realtime sync
// (UNCHANGED — do not touch this logic)
// ===================================================

function useCategoriesSync() {
  const { fetchCategories } = useSupabaseCategoryStore();

  useEffect(() => {
    // Initial fetch
    fetchCategories();

    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Delay subscription slightly to avoid premature-close errors
    const timer = setTimeout(() => {
      channel = supabase
        .channel('public:categories')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'categories' },
          () => {
            fetchCategories();
          }
        )
        .subscribe();
    }, 500);

    return () => {
      clearTimeout(timer);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchCategories]);
}

// ===================================================
// FOOTER COMPONENT
// ===================================================

export const Footer: React.FC = () => {
  const { categories, loading } = useSupabaseCategoryStore();

  // Kick off fetch + realtime subscription
  useCategoriesSync();

  // Newsletter signup — inserts into the newsletter_subscribers table.
  // RLS allows public INSERT only (see migration 005); nobody can read
  // the list back through the anon key.
  const [email, setEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || newsletterStatus === 'loading') return;

    setNewsletterStatus('loading');
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email: email.trim().toLowerCase(), source: 'footer' });

    if (error) {
      // Postgres unique_violation — they're already subscribed, treat as success
      if (error.code === '23505') {
        setNewsletterStatus('duplicate');
      } else {
        setNewsletterStatus('error');
      }
      return;
    }

    setNewsletterStatus('success');
    setEmail('');
  };

  // ===================================================
  // HELP LINKS
  // ===================================================

  const helpLinks: { label: string; to: string }[] = [
    { label: 'About Us', to: '/about' },
    { label: 'Returns & Exchanges', to: '/return-policy' },
    { label: 'Contact Us', to: '/contact' },
  ];

  // ===================================================
  // LEGAL LINKS — shown in bottom bar
  // ===================================================

  const legalLinks: { label: string; to: string }[] = [
    { label: 'Privacy Policy', to: '/privacy-policy' },
    { label: 'Terms & Conditions', to: '/terms' },
  ];

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">

        {/* ===================================================
            TOP GRID — Brand | Shop | Help | Newsletter
            Mirrors HTML ref: 1.4fr / 1fr / 1fr / 1fr
        =================================================== */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-8 pb-6 border-b border-white/10">

          {/* BRAND COLUMN */}
          <div>
            <Link to="/" className="inline-block mb-3">
              <h2 className="heading-serif text-lg font-medium tracking-wide text-white">
                {BRAND.nameTop}
                <span className="block text-[10px] font-sans font-normal tracking-[0.3em] text-rose-gold-dark -mt-1">
                  {BRAND.nameBottom}
                </span>
              </h2>
            </Link>

            <p className="text-sm text-white/50 leading-relaxed mb-4">
              {BRAND.description ?? 'Modern essentials, made to last.'}
            </p>

            {/* SOCIAL ICONS — plain, no badge, matches HTML ref */}
            <div className="flex items-center gap-3">
              {(CONTACT.instagram ?? SITE.instagram) && (
                <a
                  href={CONTACT.instagram ?? SITE.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-rose-gold-dark active:scale-90 transition-all duration-200"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </a>
              )}

              {(CONTACT.facebook ?? SITE.facebook) && (
                <a
                  href={CONTACT.facebook ?? SITE.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-rose-gold-dark active:scale-90 transition-all duration-200"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
              )}

              {(CONTACT.whatsapp ?? CONTACT.phone) && (
                <a
                  href={`https://wa.me/${(CONTACT.whatsapp ?? CONTACT.phone ?? '').replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-green-600 active:scale-90 transition-all duration-200"
                >
                  <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor">
                    <path d="M16 0C7.163 0 0 7.163 0 16c0 2.833.737 5.49 2.027 7.8L0 32l8.418-2.004A15.954 15.954 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm8.043 22.205c-.33.928-1.944 1.77-2.664 1.88-.72.111-1.62.157-2.61-.164-.602-.19-1.374-.444-2.355-.87-4.145-1.79-6.852-5.972-7.06-6.25-.207-.277-1.687-2.244-1.687-4.28 0-2.035 1.068-3.033 1.446-3.446.378-.414.825-.518 1.1-.518.275 0 .55.003.79.014.254.012.594-.096.93.71.344.827 1.17 2.862 1.272 3.069.103.207.172.45.034.727-.138.276-.207.449-.413.69-.207.242-.435.54-.62.725-.206.206-.421.43-.181.843.24.414 1.067 1.76 2.29 2.851 1.574 1.402 2.9 1.835 3.314 2.042.413.207.655.172.896-.103.24-.276 1.033-1.205 1.308-1.618.276-.414.55-.345.928-.207.378.138 2.404 1.135 2.817 1.342.413.207.688.31.79.482.104.173.104 1.002-.226 1.93z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* SHOP COLUMN — Supabase-synced categories (logic unchanged)
              Capped at 4 rows total: shows up to 1 dynamic category
              + 3 static links (New Arrivals, Sale, Wishlist) below */}
          <div>
            <p className="text-sm font-medium text-white/60 mb-3">Shop</p>
            <ul className="space-y-2.5">
              {loading && categories.length === 0 ? (
                Array.from({ length: 1 }).map((_, i) => (
                  <li key={i}>
                    <span className="inline-block h-4 w-24 rounded bg-white/10 animate-pulse" />
                  </li>
                ))
              ) : (
                categories.slice(0, 1).map(category => (
                  <li key={category.id}>
                    <Link
                      to={`/shop?category=${category.slug}`}
                      className="text-sm text-white/60 hover:text-rose-gold-dark transition-colors"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))
              )}

              <li>
                <Link to="/new-arrivals" className="text-sm text-white/60 hover:text-rose-gold-dark transition-colors">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/sale" className="text-sm text-white/60 hover:text-rose-gold-dark transition-colors">
                  Sale
                </Link>
              </li>
              <li>
                <Link to="/wishlist" className="text-sm text-white/60 hover:text-rose-gold-dark transition-colors">
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>

          {/* HELP COLUMN */}
          <div>
            <p className="text-sm font-medium text-white/60 mb-3">Help</p>
            <ul className="space-y-2.5">
              {helpLinks.map(link => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-white/60 hover:text-rose-gold-dark transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* NEWSLETTER COLUMN — new, matches HTML ref "Stay in touch" */}
          <div>
            <p className="text-sm font-medium text-white/60 mb-3">Stay in touch</p>
            <p className="text-sm text-white/50 mb-3 leading-relaxed">
              Get 10% off your first order
            </p>
            {newsletterStatus === 'success' || newsletterStatus === 'duplicate' ? (
              <p className="text-sm text-rose-gold-dark font-medium" role="status">
                {newsletterStatus === 'duplicate' ? "You're already on the list!" : "Thanks for subscribing!"}
              </p>
            ) : (
              <>
                <form onSubmit={handleNewsletterSubmit} className="flex gap-1.5">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    disabled={newsletterStatus === 'loading'}
                    className="flex-1 text-sm px-3 py-2 rounded-md border border-white/15 bg-white focus:outline-none focus:ring-1 focus:ring-rose-gold-dark disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    disabled={newsletterStatus === 'loading'}
                    className="px-3 rounded-md bg-white text-black hover:bg-rose-gold-dark hover:text-white transition-colors disabled:opacity-60"
                  >
                    <ArrowRight size={16} />
                  </button>
                </form>
                {newsletterStatus === 'error' && (
                  <p className="text-xs text-red-300 mt-1.5" role="alert">
                    Something went wrong — please try again.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ===================================================
            BOTTOM BAR — copyright | legal | payment methods
            New section, matches HTML ref bottom row
        =================================================== */}

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4">
          <p className="text-xs text-white/40">
            © {currentYear} {BRAND.nameTop}. All rights reserved.
          </p>

          <div className="flex gap-4">
            {legalLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="text-xs text-white/40 hover:text-rose-gold-dark transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {(SITE.paymentMethods ?? ['bKash', 'Nagad', 'COD']).map(method => (
              <span
                key={method}
                className="px-3 py-1 bg-white/10 rounded-md text-xs text-white/50"
              >
                {method}
              </span>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
};