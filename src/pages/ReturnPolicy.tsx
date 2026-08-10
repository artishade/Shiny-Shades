import React from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Clock, PackageCheck, XCircle } from 'lucide-react';
import { FadeIn } from '@/components/ui';
import SEO from '@/components/SEO';
import { BRAND } from '@/config/brandingConfig';
import { CONTACT, getWhatsAppLink } from '@/config/contactConfig';
import { SITE } from '@/config/siteConfig';

const policyHighlights = [
  {
    icon: Clock,
    title: '7-Day Window',
    description: 'Request a return or exchange within 7 days of delivery.',
  },
  {
    icon: PackageCheck,
    title: 'Original Condition',
    description: 'Items must be unused, unwashed, and with original tags attached.',
  },
  {
    icon: RotateCcw,
    title: 'Easy Exchange',
    description: 'Swap for a different size or color, subject to availability.',
  },
  {
    icon: XCircle,
    title: 'Non-Returnable Items',
    description: 'Innerwear, sale items, and customized pieces cannot be returned.',
  },
];

export const ReturnPolicyPage: React.FC = () => {
  const canonical = `${SITE.domain.replace(/\/$/, '')}/return-policy`;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <SEO
        title={`Returns & Exchanges — ${BRAND.fullName}`}
        description={`Learn about ${BRAND.fullName}'s returns and exchanges policy, including eligibility and how to start a request.`}
        canonical={canonical}
        siteName={BRAND.fullName}
      />

      <div className="max-w-4xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <h1 className="heading-serif text-4xl md:text-5xl font-bold text-charcoal mb-3">
              Returns & Exchanges
            </h1>
            <p className="text-[#6B5B55] max-w-xl mx-auto leading-relaxed">
              We want you to love what you ordered. If something isn't quite
              right, here's how returns and exchanges work.
            </p>
          </div>
        </FadeIn>

        {/* Highlight cards */}
        <FadeIn delay={0.05}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {policyHighlights.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-blush-light rounded-2xl p-5 text-center flex flex-col items-center"
              >
                <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center mb-3">
                  <Icon size={20} className="text-rose-gold" />
                </div>
                <h3 className="text-charcoal font-semibold text-sm mb-1">{title}</h3>
                <p className="text-[#6B5B55] text-xs leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="space-y-8 text-[#6B5B55] text-sm leading-relaxed">

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                Return Eligibility
              </h2>
              <p className="mb-2">To be eligible for a return or exchange, your item must be:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Requested within 7 days of the delivery date</li>
                <li>Unused, unworn, and unwashed, with all original tags attached</li>
                <li>In its original packaging</li>
                <li>Accompanied by proof of purchase (order number or receipt)</li>
              </ul>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                Non-Returnable Items
              </h2>
              <p className="mb-2">For hygiene and quality reasons, the following items cannot be returned or exchanged:</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>Innerwear, lingerie, and intimate apparel</li>
                <li>Items marked as final sale or purchased during clearance sales</li>
                <li>Customized or made-to-order pieces</li>
                <li>Items damaged due to misuse after delivery</li>
              </ul>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                How to Start a Return or Exchange
              </h2>
              <ol className="list-decimal list-inside space-y-1.5 ml-2">
                <li>Contact us via WhatsApp, phone, or email within 7 days of delivery</li>
                <li>Share your order number and the reason for the return or exchange</li>
                <li>Our team will confirm eligibility and share the next steps</li>
                <li>Pack the item securely with all original tags and packaging</li>
                <li>Once we receive and inspect the item, we'll process your exchange or refund</li>
              </ol>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                Refunds
              </h2>
              <p>
                Approved refunds are issued to your original payment method or as
                store credit, depending on the payment option used at checkout.
                Refunds are typically processed within 5–7 business days after the
                returned item is received and inspected.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                Damaged or Incorrect Items
              </h2>
              <p>
                If you receive a damaged, defective, or incorrect item, please
                contact us within 48 hours of delivery with photos of the product.
                We'll arrange a free replacement or full refund — no questions asked.
              </p>
            </section>

            <section>
              <h2 className="heading-serif text-xl font-bold text-charcoal mb-3">
                Need Help?
              </h2>
              <p className="mb-3">
                Our team is here to make returns and exchanges as easy as possible.
              </p>
              <div className="flex flex-wrap gap-3">
                {(CONTACT.whatsapp ?? CONTACT.phone) && (
                  <a
                    href={getWhatsAppLink('Hi, I would like to start a return/exchange for my order.')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-5 py-2.5 rounded-xl bg-rose-gold text-white text-sm font-medium hover:bg-deep-rose transition-colors"
                  >
                    Chat on WhatsApp
                  </a>
                )}
                <Link
                  to="/contact"
                  className="inline-flex items-center px-5 py-2.5 rounded-xl border-2 border-rose-gold text-rose-gold text-sm font-medium hover:bg-rose-gold hover:text-white transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </section>

          </div>
        </FadeIn>
      </div>
    </div>
  );
};
