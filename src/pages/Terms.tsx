import React from 'react';
import { FadeIn } from '@/components/ui';
import SEO from '@/components/SEO';
import { BRAND } from '@/config/brandingConfig';
import { CONTACT } from '@/config/contactConfig';
import { SITE } from '@/config/siteConfig';

const LAST_UPDATED = 'June 21, 2026';

export const TermsPage: React.FC = () => {
  const canonical = `${SITE.domain.replace(/\/$/, '')}/terms`;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <SEO
        title={`Terms & Conditions — ${BRAND.fullName}`}
        description={`The terms and conditions governing your use of ${BRAND.fullName} and any purchases made on our website.`}
        canonical={canonical}
        siteName={BRAND.fullName}
      />

      <div className="max-w-3xl mx-auto">
        <FadeIn>
          <h1 className="heading-serif text-4xl md:text-5xl font-bold text-charcoal mb-2">
            Terms & Conditions
          </h1>
          <p className="text-[#6B5B55] text-sm mb-10">Last updated: {LAST_UPDATED}</p>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="space-y-8 text-[#6B5B55] text-sm leading-relaxed">

            <section>
              <p>
                Welcome to {BRAND.fullName}. By accessing or using our website and
                placing an order with us, you agree to be bound by the following
                terms and conditions. Please read them carefully before shopping
                with us.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                1. General
              </h2>
              <p>
                These terms apply to all visitors and customers of our website.
                We reserve the right to update or modify these terms at any time
                without prior notice. Continued use of the website after changes
                are posted constitutes acceptance of those changes.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                2. Products & Pricing
              </h2>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>We make every effort to display product colors and details accurately, but slight variations may occur due to screen settings or lighting in photographs</li>
                <li>Prices are listed in the applicable currency at checkout and may change without prior notice</li>
                <li>We reserve the right to limit quantities or refuse any order at our discretion</li>
              </ul>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                3. Orders & Payment
              </h2>
              <p>
                By placing an order, you confirm that the information you provide
                is accurate and complete. Orders are confirmed once payment is
                successfully processed or, for cash-on-delivery orders, once the
                order is placed. We reserve the right to cancel any order suspected
                of fraud or unauthorized activity.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                4. Shipping & Delivery
              </h2>
              <p>
                Delivery timelines provided at checkout are estimates and may vary
                due to courier delays, weather, or other circumstances beyond our
                control. Risk of loss and title for items pass to you upon delivery
                to the courier.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                5. Returns & Exchanges
              </h2>
              <p>
                Returns and exchanges are subject to our Returns & Exchanges policy,
                available on our website. Eligibility depends on the condition of
                the item and the time elapsed since delivery.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                6. Intellectual Property
              </h2>
              <p>
                All content on this website, including images, logos, graphics,
                and text, is the property of {BRAND.fullName} and is protected by
                applicable intellectual property laws. It may not be reproduced or
                used without our written permission.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                7. Limitation of Liability
              </h2>
              <p>
                {BRAND.fullName} shall not be held liable for any indirect,
                incidental, or consequential damages arising from the use of our
                website or products, to the fullest extent permitted by law.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                8. Governing Law
              </h2>
              <p>
                These terms are governed by the laws of Bangladesh, without regard
                to conflict-of-law principles. Any disputes will be subject to the
                exclusive jurisdiction of the courts located in Dhaka, Bangladesh.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                9. Contact Us
              </h2>
              <p>
                If you have any questions about these Terms & Conditions, please
                reach out to us:
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
