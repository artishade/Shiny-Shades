/**
 * AboutUs.tsx — Shiny Shades About Us page
 *
 * Brand story, mission, values, and a CTA to shop or get in touch.
 * Follows the same patterns as ContactUs.tsx:
 *   - SEO component for meta tags
 *   - FadeIn from @/components/ui
 *   - BRAND / CONTACT / SITE from config
 *   - CSS variables for all colors (inherits active theme automatically)
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  ShieldCheck,
  Truck,
  RefreshCw,
  Star,
  Sparkles,
  Users,
  MessageCircle,
} from 'lucide-react';
import { Button, FadeIn } from '@/components/ui';
import SEO from '@/components/SEO';
import { BRAND } from '@/config/brandingConfig';
import { CONTACT, getWhatsAppLink } from '@/config/contactConfig';
import { SITE } from '@/config/siteConfig';

// ─── Static data ──────────────────────────────────────────────────────────────

const STATS = [
  { value: '500+', label: 'Products' },
  { value: '10k+', label: 'Happy Customers' },
  { value: '64', label: 'Districts Delivered' },
  { value: '4.9★', label: 'Avg. Rating' },
];

const VALUES = [
  {
    icon: <Heart size={22} className="text-rose-gold" />,
    title: 'Made with Love',
    body:
      'Every product is hand-picked by our team. We only list what we would wear ourselves — nothing gets through that we wouldnt be proud to gift a friend.',
  },
  {
    icon: <ShieldCheck size={22} className="text-rose-gold" />,
    title: 'Genuine & Authentic',
    body:
      'No replicas, no shortcuts. Every item is sourced directly from trusted manufacturers. What you see in our photos is exactly what arrives at your door.',
  },
  {
    icon: <Sparkles size={22} className="text-rose-gold" />,
    title: 'Style for Every Woman',
    body:
      'From bold western dresses to everyday innerwear, we believe every woman deserves to feel beautiful — regardless of size, budget, or occasion.',
  },
];

const REASONS = [
  {
    icon: <Truck size={18} className="text-rose-gold" />,
    title: 'Fast Delivery',
    body: 'Dhaka same-day. All 64 districts within 3–5 days. Real-time order tracking included.',
  },
  {
    icon: <ShieldCheck size={18} className="text-rose-gold" />,
    title: 'Quality Checked',
    body: 'Every piece passes a quality check before it ships. Damaged on arrival? We fix it — no questions asked.',
  },
  {
    icon: <RefreshCw size={18} className="text-rose-gold" />,
    title: 'Easy Returns',
    body: 'Changed your mind? Contact us within 3 days of delivery and we\'ll sort it out.',
  },
  {
    icon: <MessageCircle size={18} className="text-rose-gold" />,
    title: '7-Day Support',
    body: 'Our team is available every day via WhatsApp and Messenger. We reply fast — usually within an hour.',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const AboutUsPage: React.FC = () => {
  const canonical = `${SITE.domain.replace(/\/$/, '')}/about`;

  return (
    <div className="min-h-screen bg-soft-bg">
      <SEO
        title={`About Us — ${BRAND.fullName}`}
        description={`Learn the story behind ${BRAND.fullName} — Bangladesh's home for premium women's fashion, genuine products, and fast delivery.`}
        canonical={canonical}
        siteName={BRAND.fullName}
      />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        {/* Decorative background blobs */}
        <div
          aria-hidden
          className="absolute -top-16 -right-24 w-80 h-80 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--color-blush) 0%, transparent 70%)' }}
        />
        <div
          aria-hidden
          className="absolute -bottom-10 -left-16 w-60 h-60 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--color-rose-gold) 0%, transparent 70%)' }}
        />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <FadeIn direction="none">
            {/* Eyebrow */}
            <p className="text-xs font-semibold tracking-[0.3em] text-rose-gold uppercase mb-5">
              Our Story
            </p>

            {/* Stacked brand-style headline */}
            <h1 className="heading-serif text-5xl md:text-7xl font-bold text-charcoal leading-[0.9] mb-6">
              {BRAND.nameTop}
              <br />
              <span className="text-rose-gold italic">{BRAND.nameBottom}</span>
            </h1>

            {/* Decorative rule */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-px w-16 bg-blush-dark" />
              <Star size={12} className="text-rose-gold fill-rose-gold" />
              <div className="h-px w-16 bg-blush-dark" />
            </div>

            <p className="text-[#6B5B55] text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
              {BRAND.description}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── STATS STRIP ───────────────────────────────────────────────────── */}
      <section className="bg-rose-gold py-10 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.08} direction="up">
              <p className="text-white text-3xl md:text-4xl font-bold heading-serif leading-none">
                {stat.value}
              </p>
              <p className="text-white/80 text-xs tracking-widest uppercase mt-1">
                {stat.label}
              </p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── OUR STORY ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Story text */}
          <FadeIn direction="right">
            <p className="text-xs font-semibold tracking-[0.3em] text-rose-gold uppercase mb-4">
              How It Started
            </p>
            <h2 className="heading-serif text-3xl md:text-4xl font-bold text-charcoal mb-6 leading-tight">
              Born from a simple belief — every woman deserves to look and feel her best.
            </h2>
            <div className="space-y-4 text-[#6B5B55] leading-relaxed">
              <p>
                {BRAND.fullName} started in Dhaka with one question: why was it so hard to find
                women's fashion that was both genuinely beautiful <em>and</em> honestly priced?
                Every shop either compromised on quality or charged far more than fair.
              </p>
              <p>
                So we built something different. We went directly to the makers — connecting
                with manufacturers across Bangladesh and beyond — cutting out the middlemen
                and passing the savings straight to you.
              </p>
              <p>
                Today, {BRAND.fullName} ships to all 64 districts. Thousands of women across
                Bangladesh start their morning choosing something from us, and that trust is
                something we take seriously every single day.
              </p>
            </div>
          </FadeIn>

          {/* Visual card — fabric swatch motif */}
          <FadeIn direction="left" delay={0.1}>
            <div className="relative">
              {/* Main card */}
              <div className="bg-blush-light rounded-3xl p-10 relative overflow-hidden">
                {/* Tiled diagonal label pattern (echoes the watermark system) */}
                <svg
                  aria-hidden
                  className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern id="about-label-pattern" x="0" y="0" width="80" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
                      <text x="0" y="20" fontFamily="serif" fontSize="10" fill="var(--color-rose-gold)" letterSpacing="2">
                        {BRAND.fullName}
                      </text>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#about-label-pattern)" />
                </svg>

                {/* Quote */}
                <blockquote className="relative z-10 text-center">
                  <span className="text-6xl text-rose-gold font-serif leading-none select-none">"</span>
                  <p className="heading-serif text-xl md:text-2xl text-charcoal font-semibold leading-snug mt-2 mb-4">
                    {BRAND.tagline}
                  </p>
                  <footer className="text-xs tracking-widest text-rose-gold uppercase font-semibold">
                    — {BRAND.fullName}
                  </footer>
                </blockquote>
              </div>

              {/* Floating badge */}
              <div
                className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full flex flex-col items-center justify-center text-center shadow-lg"
                style={{ background: 'var(--color-rose-gold)' }}
              >
                <Users size={18} className="text-white mb-0.5" />
                <span className="text-white text-xs font-bold leading-tight">Est.</span>
                <span className="text-white text-xs font-bold leading-tight">2023</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── VALUES ────────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-blush-light/40">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-[0.3em] text-rose-gold uppercase mb-3">
                What We Stand For
              </p>
              <h2 className="heading-serif text-3xl md:text-4xl font-bold text-charcoal">
                Our Values
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map((v, i) => (
              <FadeIn key={v.title} delay={i * 0.1} direction="up">
                <div className="bg-white rounded-2xl p-7 h-full shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="w-10 h-10 rounded-xl bg-blush-light flex items-center justify-center mb-4">
                    {v.icon}
                  </div>
                  <h3 className="heading-serif text-lg font-bold text-charcoal mb-3">
                    {v.title}
                  </h3>
                  <p className="text-[#6B5B55] text-sm leading-relaxed">
                    {v.body}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-[0.3em] text-rose-gold uppercase mb-3">
                The Difference
              </p>
              <h2 className="heading-serif text-3xl md:text-4xl font-bold text-charcoal">
                Why Women Choose Us
              </h2>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {REASONS.map((r, i) => (
              <FadeIn key={r.title} delay={i * 0.08} direction="up">
                <div className="flex gap-4 p-6 rounded-2xl border border-blush hover:border-rose-gold/30 hover:bg-blush-light/30 transition-all duration-300">
                  <div className="w-9 h-9 rounded-lg bg-blush-light flex items-center justify-center flex-shrink-0 mt-0.5">
                    {r.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-charcoal mb-1">{r.title}</h3>
                    <p className="text-[#6B5B55] text-sm leading-relaxed">{r.body}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROMISE BANNER ────────────────────────────────────────────────── */}
      <section className="mx-4 md:mx-8 mb-8 rounded-3xl overflow-hidden">
        <div
          className="relative py-16 px-8 text-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--color-deep-rose) 0%, var(--color-rose-gold) 60%, var(--color-rose-gold-light) 100%)' }}
        >
          {/* Subtle SVG label pattern overlay */}
          <svg aria-hidden className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
            <defs>
              <pattern id="promise-pattern" x="0" y="0" width="120" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">
                <text x="0" y="30" fontFamily="serif" fontSize="14" fill="white" letterSpacing="3">
                  {BRAND.fullName}
                </text>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#promise-pattern)" />
          </svg>

          <FadeIn direction="none" className="relative z-10">
            <Star size={24} className="text-white/70 mx-auto mb-4 fill-white/40" />
            <h2 className="heading-serif text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              Our Promise to You
            </h2>
            <p className="text-white/90 text-base md:text-lg max-w-xl mx-auto leading-relaxed mb-8">
              If you're ever unhappy with your order for any reason, reach out to us and
              we will make it right. That's our word — not just a policy.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/shop">
                <Button
                  variant="primary"
                  size="lg"
                  className="!bg-white !text-rose-gold hover:!bg-blush-light !shadow-none"
                >
                  Shop Now
                </Button>
              </Link>
              <a
                href={getWhatsAppLink(`Hello ${BRAND.fullName}, I have a question.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="!border-white !text-white hover:!bg-white/10 !shadow-none"
                >
                  Chat on WhatsApp
                </Button>
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── CONTACT NUDGE ─────────────────────────────────────────────────── */}
      <section className="py-12 px-4 text-center">
        <FadeIn direction="none">
          <p className="text-[#6B5B55] mb-2">Still have questions?</p>
          <Link
            to="/contact"
            className="text-rose-gold font-semibold hover:text-deep-rose underline underline-offset-4 transition-colors"
          >
            Visit our Contact page →
          </Link>
          {CONTACT.address && (
            <p className="text-[#6B5B55] text-sm mt-4 opacity-70">
              📍 {CONTACT.address}
            </p>
          )}
        </FadeIn>
      </section>
    </div>
  );
};

export default AboutUsPage;
