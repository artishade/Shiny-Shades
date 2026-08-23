import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { SITE, siteConfig } from '@/config/siteConfig';
import type { HeroLayout, HeroExtraComponent } from '@/lib/heroLayout';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTENT_ROW_ID = 'global-content';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  gradient: string;
  imageUrl: string;
  // Optional dedicated crop for narrow viewports — falls back to imageUrl
  // when empty. Same pattern as heroImageUrlMobile.
  imageUrlMobile?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video' | 'gradient';
  active: boolean;
}

export interface AnnouncementSettings {
  enabled: boolean;
  messages: string[];
  animation: 'marquee' | 'fade' | 'static';
  bgColor: string;
  textColor: string;
  bold: boolean;
  dismissible: boolean;
}

/**
 * SiteSettings — overridable site-wide config stored in Supabase.
 * Falls back to siteConfig.ts values when not set in DB.
 *
 * This is the single source of truth for multi-brand deployments.
 * Every field can be changed from Admin → Content → Brand Settings
 * without touching any source files.
 */
export interface SiteSettings {
  // ── Identity ──────────────────────────────────────────────────────────────
  siteName: string;
  siteShortName: string;
  domain: string;
  logoUrl: string;
  /** Logo used for image watermarking in admin (falls back to logoUrl if empty) */
  watermarkLogoUrl: string;
  /** Short brand description used in footer and OG fallback */
  brandDescription: string;
  /** Tagline shown in footer bottom bar and search placeholder */
  brandTagline: string;

  // ── SEO / meta ────────────────────────────────────────────────────────────
  defaultTitle: string;
  defaultDescription: string;
  keywords: string[];
  ogImage: string;

  // ── Analytics & Tracking ─────────────────────────────────────────────────
  /** Facebook Pixel ID — e.g. "1341948154747302" */
  facebookPixelId: string;
  /** Google Tag Manager container ID — e.g. "GTM-TWN3NF5S" */
  gtmId: string;
  /** Google Search Console HTML tag verification content value */
  googleSearchConsoleVerification: string;
  /** Bing Webmaster Tools verification content value */
  bingVerification: string;

  // ── Social links ──────────────────────────────────────────────────────────
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  whatsapp: string;
  messenger: string;
  /** Twitter / X handle — e.g. "@shinyshadess" */
  twitterHandle: string;

  // ── Contact ───────────────────────────────────────────────────────────────
  email: string;
  phone: string;
  address: string;

  // ── Commerce ──────────────────────────────────────────────────────────────
  currency: string;
  currencySymbol: string;
  paymentMethods: string[];
  /** bKash / Nagad payment number shown at checkout */
  paymentNumber: string;

  // ── Policies ──────────────────────────────────────────────────────────────
  returnPolicy: string;
  shippingPolicy: string;
  privacyPolicy: string;
}

export interface NewArrivalsSection {
  title: string;
  subtitle: string;
  buttonUrl: string;
  emptyMessage: string;
  backgroundColor: string;
}

export interface ContentData {
  // Hero
  heroEnabled: boolean;
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  heroImageUrl: string;
  // Optional separate crop/upload for narrow viewports — falls back to
  // heroImageUrl when empty, so this is fully backward compatible.
  heroImageUrlMobile?: string;
  heroLayout?: HeroLayout;
  newArrivalsSection: NewArrivalsSection;
  heroExtraComponents?: HeroExtraComponent[];

  // Banners
  banners: Banner[];
  newArrivalBanners: Banner[];
  saleBanners: Banner[];

  // Announcement bar
  announcement: AnnouncementSettings;

  // Section titles
  featuredTitle: string;
  featuredSubtitle: string;
  trendingTitle: string;
  trendingSubtitle: string;
  newsletterTitle: string;
  newsletterSubtitle: string;

  // Centralised site settings (editable from admin, seeded from siteConfig.ts)
  siteSettings: SiteSettings;
}

export interface ContentError {
  code: 'LOAD_FAILED' | 'SAVE_FAILED' | 'UNKNOWN';
  message: string;
  at: number; // Date.now()
}

export interface ContentLoadingState {
  load: boolean;
  save: boolean;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
// Seeded from siteConfig.ts so the two sources stay in sync out of the box.

export const defaultSiteSettings: SiteSettings = {
  siteName: siteConfig.websiteName,
  siteShortName: siteConfig.websiteShortName,
  domain: SITE.domain,
  logoUrl: '',
  watermarkLogoUrl: '',
  brandDescription: '',
  brandTagline: '',

  defaultTitle: SITE.defaultTitle,
  defaultDescription: SITE.defaultDescription,
  keywords: [...SITE.keywords],
  ogImage: SITE.ogImage,

  facebookPixelId: '',
  gtmId: '',
  googleSearchConsoleVerification: '',
  bingVerification: '',

  instagram: SITE.instagram,
  facebook: SITE.facebook,
  tiktok: '',
  youtube: '',
  whatsapp: '',
  messenger: '',
  twitterHandle: '',

  email: '',
  phone: '',
  address: '',

  currency: SITE.currency.code,
  currencySymbol: '$',
  paymentMethods: [...SITE.paymentMethods],
  paymentNumber: '',

  returnPolicy: '',
  shippingPolicy: '',
  privacyPolicy: '',
};

export const defaultContent: ContentData = {
  heroEnabled: true,
  heroTitle: 'Discover Your Style',
  heroSubtitle: 'Explore our curated collection of girlswear — designed for confidence, comfort, and elegance.',
  heroButtonText: 'Shop Now',
  heroImageUrl: '',
  heroImageUrlMobile: '',

  newArrivalsSection: {
    title: 'New Arrivals',
    subtitle: 'Fresh styles just landed',
    buttonUrl: '/products',
    emptyMessage: 'No new arrivals available.',
    backgroundColor: '#FAF7F3',
  },

  banners: [],
  newArrivalBanners: [],
  saleBanners: [],

  announcement: {
    enabled: true,
    messages: ['Free shipping on orders over $500!'],
    animation: 'marquee',
    bgColor: '#000000',
    textColor: '#ffffff',
    bold: false,
    dismissible: false,
  },

  featuredTitle: 'Featured Collection',
  featuredSubtitle: 'Handpicked styles just for you',
  trendingTitle: 'Trending Now',
  trendingSubtitle: 'What everyone is wearing right now',
  newsletterTitle: 'Stay in the Loop',
  newsletterSubtitle: 'Get the latest drops, exclusive offers, and style inspiration.',

  siteSettings: defaultSiteSettings,
};

// ─── Merge helpers ────────────────────────────────────────────────────────────

/** Deep-merge loaded data with defaults so missing keys never cause crashes */
function mergeWithDefaults(loaded: Partial<ContentData>): ContentData {
  return {
    ...defaultContent,
    ...loaded,

    newArrivalsSection: {
      ...defaultContent.newArrivalsSection,
      ...(loaded.newArrivalsSection ?? {}),
    },

    announcement: {
      ...defaultContent.announcement,
      ...(loaded.announcement ?? {}),
      messages:
        Array.isArray(loaded.announcement?.messages) && loaded.announcement.messages.length > 0
          ? loaded.announcement.messages
          : defaultContent.announcement.messages,
    },

    banners: Array.isArray(loaded.banners) ? loaded.banners : [],
    newArrivalBanners: Array.isArray(loaded.newArrivalBanners) ? loaded.newArrivalBanners : [],
    saleBanners: Array.isArray(loaded.saleBanners) ? loaded.saleBanners : [],

    // Merge siteSettings: DB value wins; anything missing falls back to siteConfig.ts defaults
    siteSettings: {
      ...defaultSiteSettings,
      ...(loaded.siteSettings ?? {}),
    },
  };
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface ContentStore {
  content: ContentData;
  loading: ContentLoadingState;
  hasFetched: boolean;
  error: ContentError | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  /** Local setter — used by admin editor for live preview before save */
  setContent: (data: ContentData) => void;
  /** Patch only siteSettings without touching the rest of content */
  setSiteSettings: (settings: Partial<SiteSettings>) => void;

  loadContent: () => Promise<void>;
  saveContent: (data: ContentData) => Promise<void>;
  /** Convenience: save only siteSettings changes */
  saveSiteSettings: (settings: Partial<SiteSettings>) => Promise<void>;

  // ── Selectors (synchronous, zero-cost) ───────────────────────────────────
  getSiteSettings: () => SiteSettings;
  /** Returns the best available page title for <title> / og:title */
  getPageTitle: (pageTitle?: string) => string;
  /** Returns active banners from a given banner list */
  getActiveBanners: (type: 'banners' | 'newArrivalBanners' | 'saleBanners') => Banner[];

  // ── Internal helpers ──────────────────────────────────────────────────────
  _setError: (code: ContentError['code'], message: string) => void;
  _clearError: () => void;
}

// ─── Store implementation ─────────────────────────────────────────────────────

export const useContentStore = create<ContentStore>()((set, get) => ({
  content: defaultContent,
  loading: { load: false, save: false },
  hasFetched: false,
  error: null,

  // ── Internal helpers ──────────────────────────────────────────────────────

  _setError: (code, message) =>
    set({ error: { code, message, at: Date.now() } }),

  _clearError: () => set({ error: null }),

  // ── Local setters ─────────────────────────────────────────────────────────

  setContent: (data) => set({ content: data }),

  setSiteSettings: (settings) =>
    set((s) => ({
      content: {
        ...s.content,
        siteSettings: { ...s.content.siteSettings, ...settings },
      },
    })),

  // ── Load from Supabase ────────────────────────────────────────────────────

  loadContent: async () => {
    const { hasFetched, loading, _setError, _clearError } = get();
    if (hasFetched || loading.load) return;

    _clearError();
    set((s) => ({ loading: { ...s.loading, load: true } }));

    try {
      const { data, error } = await supabase
        .from('site_content')
        .select('content')
        .eq('id', CONTENT_ROW_ID)
        .single();

      // PGRST116 = row not found — fine, use defaults
      if (error && error.code !== 'PGRST116') throw error;

      set({
        content: data?.content ? mergeWithDefaults(data.content) : defaultContent,
        loading: { load: false, save: false },
        hasFetched: true,
        error: null,
      });
    } catch (err) {
      console.error('[ContentStore] loadContent:', err);
      _setError(
        'LOAD_FAILED',
        err instanceof Error ? err.message : 'Failed to load content',
      );
      set((s) => ({
        content: defaultContent,
        loading: { ...s.loading, load: false },
        hasFetched: true,
      }));
    }
  },

  // ── Save to Supabase ──────────────────────────────────────────────────────

  saveContent: async (data) => {
    const { _setError, _clearError } = get();
    _clearError();
    set((s) => ({ loading: { ...s.loading, save: true } }));

    try {
      const { error } = await supabase
        .from('site_content')
        .upsert(
          { id: CONTENT_ROW_ID, content: data, updated_at: new Date().toISOString() },
          { onConflict: 'id' },
        );

      if (error) throw error;

      // Sync confirmed write into local state
      set((s) => ({
        content: data,
        loading: { ...s.loading, save: false },
        error: null,
      }));
    } catch (err) {
      console.error('[ContentStore] saveContent:', err);
      _setError(
        'SAVE_FAILED',
        err instanceof Error ? err.message : 'Failed to save content',
      );
      set((s) => ({ loading: { ...s.loading, save: false } }));
      throw err; // Let the UI surface this
    }
  },

  // ── Save only siteSettings ────────────────────────────────────────────────

  saveSiteSettings: async (settings) => {
    const { content, saveContent } = get();
    const updated: ContentData = {
      ...content,
      siteSettings: { ...content.siteSettings, ...settings },
    };
    await saveContent(updated);
  },

  // ── Selectors ─────────────────────────────────────────────────────────────

  getSiteSettings: () => get().content.siteSettings,

  getPageTitle: (pageTitle) => {
    const { defaultTitle, siteName } = get().content.siteSettings;
    if (!pageTitle) return defaultTitle;
    return `${pageTitle} — ${siteName}`;
  },

  getActiveBanners: (type) =>
    get().content[type].filter((b) => b.active),
}));