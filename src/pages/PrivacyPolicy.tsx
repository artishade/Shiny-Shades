import React from 'react';
import { FadeIn } from '@/components/ui';
import SEO from '@/components/SEO';
import { BRAND } from '@/config/brandingConfig';
import { CONTACT } from '@/config/contactConfig';
import { SITE } from '@/config/siteConfig';

const LAST_UPDATED = 'June 21, 2026';

export const PrivacyPolicyPage: React.FC = () => {
  const canonical = `${SITE.domain.replace(/\/$/, '')}/privacy-policy`;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <SEO
        title={`Privacy Policy — ${BRAND.fullName}`}
        description={`Read how ${BRAND.fullName} collects, uses, and protects your personal information.`}
        canonical={canonical}
        siteName={BRAND.fullName}
      />

      <div className="max-w-3xl mx-auto">
        <FadeIn>
          <h1 className="heading-serif text-4xl md:text-5xl font-bold text-charcoal mb-2">
            Privacy Policy
          </h1>
          <p className="text-[#6B5B55] text-sm mb-10">Last updated: {LAST_UPDATED}</p>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="prose-policy space-y-8 text-[#6B5B55] text-sm leading-relaxed">

            <section>
              <p>
                {BRAND.fullName} ("we", "us", or "our") respects your privacy and is
                committed to protecting the personal information you share with us.
                This Privacy Policy explains what information we collect, how we use
                it, and the choices you have.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                1. Information We Collect
              </h2>
              <p className="mb-2">When you browse our store or place an order, we may collect:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Contact details — name, phone number, email address, and delivery address</li>
                <li>Order details — items purchased, order value, and payment method</li>
                <li>Account information, if you create one with us</li>
                <li>Basic technical data such as device type, browser, and pages visited, used to improve our website</li>
              </ul>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                2. How We Use Your Information
              </h2>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>To process and deliver your orders</li>
                <li>To communicate with you about your order status</li>
                <li>To respond to customer service requests</li>
                <li>To improve our products, website, and overall shopping experience</li>
                <li>To send promotional updates, only if you have opted in to receive them</li>
              </ul>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                3. How We Protect Your Information
              </h2>
              <p>
                We take reasonable technical and organizational measures to keep your
                personal information secure. Payment details are processed through
                trusted third-party payment providers and are never stored on our servers.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                4. Sharing of Information
              </h2>
              <p>
                We do not sell your personal information. We may share necessary order
                details with delivery partners and payment processors solely to fulfill
                your order, and we may disclose information if required to do so by law.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                5. Cookies
              </h2>
              <p>
                Our website may use cookies and similar technologies to remember your
                preferences, keep items in your cart, and understand how visitors use
                our site. You can disable cookies in your browser settings, though some
                features may not work as intended.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                6. Your Choices
              </h2>
              <p>
                You may request access to, correction of, or deletion of your personal
                information at any time by contacting us using the details below. You
                may also unsubscribe from promotional messages at any time.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                7. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. Any changes will
                be posted on this page with an updated revision date.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                8. Contact Us
              </h2>
              <p>
                If you have any questions about this Privacy Policy, please reach out to us:
              </p>
              <ul className="list-none space-y-1 mt-2">
                {CONTACT.email && <li>Email: {CONTACT.email}</li>}
                {CONTACT.phone && <li>Phone: {CONTACT.phone}</li>}
                {CONTACT.address && <li>Address: {CONTACT.address}</li>}
              </ul>
            </section>

          </div>
        </FadeIn>
      </div>
    </div>
  );
};
