import { CustomerLayout } from '@/components/layout/CustomerLayout';
import React from 'react';
import { Link, useSearchParams } from '@/lib/routerCompat';
import { XCircle } from 'lucide-react';
import { m as motion } from 'framer-motion';
import { Button } from '@/components/ui';
import SEO from '@/components/SEO';
import { BRAND } from '@/config/brandingConfig';
import { SITE } from '@/config/siteConfig';

export const PaymentCancelPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order') || '';
  const canonical = `${SITE.domain.replace(/\/$/, '')}/payment/cancel`;

  const color = '#DC2626';
  const bg = 'rgba(220,38,38,0.08)';

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4"
      style={{ background: '#FAF6F3' }}>
      <SEO
        title={`Payment Failed — ${BRAND.fullName}`}
        description="Your payment was not completed."
        canonical={canonical}
        siteName={BRAND.fullName}
        robots={['noindex', 'nofollow']}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md mx-auto w-full"
      >
        {/* Icon */}
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: bg }}>
          <XCircle size={44} className="text-red-500" />
        </div>

        {/* Title */}
        <h1 className="heading-serif text-2xl font-bold text-charcoal mb-3">
          Payment Cancelled
        </h1>

        {/* Error box */}
        <div className="rounded-2xl p-4 mb-6 text-sm text-left"
          style={{ background: bg, border: `1px solid ${color}30` }}>
          <p style={{ color }}>Your payment was not completed and you haven&apos;t been charged.</p>
        </div>

        {/* Order number */}
        {orderNumber && (
          <p className="text-sm text-[#6B5B55] mb-6">
            Order reference: <strong className="text-charcoal">{orderNumber}</strong>
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Link to="/cart">
            <Button size="lg">Try Again</Button>
          </Link>
          <Link to="/contact">
            <Button variant="outline" size="lg">Need Help?</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

PaymentCancelPage.getLayout = function getLayout(page: React.ReactElement) {
  return <CustomerLayout>{page}</CustomerLayout>;
};

export default PaymentCancelPage;
