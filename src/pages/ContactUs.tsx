import React, { useState } from 'react';
import { MapPin, Phone, Mail, MessageCircle, Send, CheckCircle2 } from 'lucide-react';
import { Button, FadeIn } from '@/components/ui';
import SEO from '@/components/SEO';
import { BRAND } from '@/config/brandingConfig';
import { CONTACT, getWhatsAppLink } from '@/config/contactConfig';
import { SITE } from '@/config/siteConfig';

export const ContactUsPage: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // No backend endpoint exists yet for contact submissions, so we hand the
    // message off to the customer's email client pre-filled and ready to send.
    const subject = encodeURIComponent(`Message from ${form.name || 'website visitor'}`);
    const body = encodeURIComponent(
      `${form.message}\n\n— ${form.name}\n${form.email}`
    );

    if (CONTACT.email) {
      window.location.href = `mailto:${CONTACT.email}?subject=${subject}&body=${body}`;
    }

    setSubmitted(true);
    setForm({ name: '', email: '', message: '' });
  };

  const canonical = `${SITE.domain.replace(/\/$/, '')}/contact`;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <SEO
        title={`Contact Us — ${BRAND.fullName}`}
        description={`Get in touch with ${BRAND.fullName}. We're happy to help with orders, sizing, or anything else.`}
        canonical={canonical}
        siteName={BRAND.fullName}
      />

      <div className="max-w-5xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <h1 className="heading-serif text-4xl md:text-5xl font-bold text-charcoal mb-3">
              Contact Us
            </h1>
            <p className="text-[#6B5B55] max-w-xl mx-auto leading-relaxed">
              Have a question about an order, a product, or anything else?
              We'd love to hear from you.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Contact details ──────────────────────────────────── */}
          <FadeIn direction="left" className="lg:col-span-2">
            <div className="bg-blush-light rounded-2xl p-6 md:p-8 h-full">
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-6">
                Get in Touch
              </h2>

              <ul className="space-y-5">
                {CONTACT.address && (
                  <li className="flex items-start gap-3">
                    <MapPin size={18} className="text-rose-gold mt-0.5 flex-shrink-0" />
                    <span className="text-[#6B5B55] text-sm leading-relaxed">
                      {CONTACT.address}
                    </span>
                  </li>
                )}

                {CONTACT.phone && (
                  <li className="flex items-start gap-3">
                    <Phone size={18} className="text-rose-gold mt-0.5 flex-shrink-0" />
                    <a
                      href={`tel:${CONTACT.phone}`}
                      className="text-[#6B5B55] text-sm hover:text-rose-gold transition-colors"
                    >
                      {CONTACT.phone}
                    </a>
                  </li>
                )}

                {CONTACT.email && (
                  <li className="flex items-start gap-3">
                    <Mail size={18} className="text-rose-gold mt-0.5 flex-shrink-0" />
                    <a
                      href={`mailto:${CONTACT.email}`}
                      className="text-[#6B5B55] text-sm hover:text-rose-gold transition-colors"
                    >
                      {CONTACT.email}
                    </a>
                  </li>
                )}

                {(CONTACT.whatsapp ?? CONTACT.phone) && (
                  <li className="flex items-start gap-3">
                    <MessageCircle size={18} className="text-rose-gold mt-0.5 flex-shrink-0" />
                    <a
                      href={getWhatsAppLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6B5B55] text-sm hover:text-rose-gold transition-colors"
                    >
                      Chat on WhatsApp
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </FadeIn>

          {/* ── Contact form ─────────────────────────────────────── */}
          <FadeIn direction="right" delay={0.1} className="lg:col-span-3">
            <div className="bg-white border border-blush rounded-2xl p-6 md:p-8">
              {submitted ? (
                <div className="flex flex-col items-center text-center py-10">
                  <CheckCircle2 size={48} className="text-green-500 mb-4" />
                  <h3 className="heading-serif text-xl font-bold text-charcoal mb-2">
                    Thank you!
                  </h3>
                  <p className="text-[#6B5B55] text-sm mb-6">
                    Your message is on its way. We'll get back to you soon.
                  </p>
                  <Button variant="outline" onClick={() => setSubmitted(false)}>
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-charcoal mb-1.5">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your name"
                      className="w-full px-4 py-2.5 rounded-xl border border-blush focus:border-rose-gold focus:outline-none focus:ring-2 focus:ring-rose-gold/20 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1.5">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-blush focus:border-rose-gold focus:outline-none focus:ring-2 focus:ring-rose-gold/20 text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-charcoal mb-1.5">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={handleChange}
                      placeholder="How can we help?"
                      className="w-full px-4 py-2.5 rounded-xl border border-blush focus:border-rose-gold focus:outline-none focus:ring-2 focus:ring-rose-gold/20 text-sm resize-none"
                    />
                  </div>

                  <Button type="submit" size="lg" fullWidth>
                    <Send size={16} />
                    Send Message
                  </Button>
                </form>
              )}
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
};
