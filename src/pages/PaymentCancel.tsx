import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, CreditCard, AlertTriangle, Ban, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import SEO from '@/components/SEO';
import { BRAND } from '@/config/brandingConfig';
import { SITE } from '@/config/siteConfig';

// Maps Stripe decline codes to friendly messages
const getErrorInfo = (reason: string | null): {
  icon: React.ReactNode;
  title: string;
  message: string;
  color: string;
  bg: string;
} => {
  const r = (reason || '').toLowerCase();

  if (r.includes('insufficient_funds') || r.includes('insufficient funds')) return {
    icon: <CreditCard size={44} className="text-orange-500" />,
    title: 'Insufficient Funds',
    message: "Your card doesn't have enough balance to complete this payment. Please try a different card or top up your account.",
    color: '#EA580C',
    bg: 'rgba(234,88,12,0.08)',
  };

  if (r.includes('card_declined') || r.includes('declined') || r.includes('do_not_honor')) return {
    icon: <Ban size={44} className="text-red-500" />,
    title: 'Card Declined',
    message: "Your card was declined by your bank. Please try a different card or contact your bank to authorize the payment.",
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.08)',
  };

  if (r.includes('expired_card') || r.includes('invalid_expiry')) return {
    icon: <CreditCard size={44} className="text-red-500" />,
    title: 'Card Expired',
    message: "Your card has expired. Please use a different card with a valid expiry date.",
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.08)',
  };

  if (r.includes('incorrect_cvc') || r.includes('invalid_cvc')) return {
    icon: <CreditCard size={44} className="text-red-500" />,
    title: 'Incorrect CVC / CVV',
    message: "The security code you entered doesn't match your card. Please double-check your CVC/CVV and try again.",
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.08)',
  };

  if (r.includes('incorrect_number') || r.includes('invalid_number')) return {
    icon: <CreditCard size={44} className="text-red-500" />,
    title: 'Invalid Card Number',
    message: "The card number you entered is incorrect. Please check the number and try again.",
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.08)',
  };

  if (r.includes('authentication') || r.includes('3d_secure') || r.includes('3ds')) return {
    icon: <AlertTriangle size={44} className="text-amber-500" />,
    title: '3D Secure Authentication Failed',
    message: "Your bank requires additional verification but it was not completed. Please try again and approve the request in your banking app.",
    color: '#D97706',
    bg: 'rgba(217,119,6,0.08)',
  };

  if (r.includes('lost_card') || r.includes('stolen_card')) return {
    icon: <Ban size={44} className="text-red-500" />,
    title: 'Card Not Accepted',
    message: "This card cannot be used for this transaction. Please use a different card.",
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.08)',
  };

  if (r.includes('processing_error') || r.includes('try_again')) return {
    icon: <WifiOff size={44} className="text-amber-500" />,
    title: 'Processing Error',
    message: "Something went wrong while processing your payment. Please wait a moment and try again.",
    color: '#D97706',
    bg: 'rgba(217,119,6,0.08)',
  };

  // Generic cancel (user clicked back/cancel on Stripe page)
  return {
    icon: <XCircle size={44} className="text-red-500" />,
    title: 'Payment Cancelled',
    message: "Your payment was not completed and you haven't been charged.",
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.08)',
  };
};

export const PaymentCancelPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order') || '';
  const reason = searchParams.get('reason') || null;
  const canonical = `${SITE.domain.replace(/\/$/, '')}/payment/cancel`;

  const { icon, title, message, color, bg } = getErrorInfo(reason);

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
          {icon}
        </div>

        {/* Title */}
        <h1 className="heading-serif text-2xl font-bold text-charcoal mb-3">
          {title}
        </h1>

        {/* Error box */}
        <div className="rounded-2xl p-4 mb-6 text-sm text-left"
          style={{ background: bg, border: `1px solid ${color}30` }}>
          <p style={{ color }}>{message}</p>
        </div>

        {/* Order number */}
        {orderNumber && (
          <p className="text-sm text-[#6B5B55] mb-6">
            Order reference: <strong className="text-charcoal">{orderNumber}</strong>
          </p>
        )}

        {/* Test card hint (remove in production) */}
        {import.meta.env.DEV && (
          <div className="rounded-xl p-3 mb-6 text-xs text-left"
            style={{ background: 'rgba(99,91,255,0.06)', border: '1px solid rgba(99,91,255,0.2)', color: '#635BFF' }}>
            <p className="font-semibold mb-1">🧪 Test Mode — Try these cards:</p>
            <p>✅ Success: <code>4242 4242 4242 4242</code></p>
            <p>❌ Declined: <code>4000 0000 0000 0002</code></p>
            <p>💸 Insufficient: <code>4000 0000 0000 9995</code></p>
            <p>🔐 3D Secure: <code>4000 0025 0000 3155</code></p>
          </div>
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