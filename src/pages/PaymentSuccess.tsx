import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import SEO from '@/components/SEO';
import { BRAND } from '@/config/brandingConfig';
import { SITE } from '@/config/siteConfig';
import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/store';

type PollState = 'checking' | 'verified' | 'pending' | 'failed';

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order') || '';
  const clearCart = useCartStore((s) => s.clearCart);
  const [state, setState] = useState<PollState>('checking');

  useEffect(() => {
    if (!orderNumber) {
      setState('failed');
      return;
    }

    let attempts = 0;
    let cancelled = false;

    // The gateway webhook/IPN updates payment_status independently of this
    // page load, and can land a second or two after the redirect — so we
    // poll briefly rather than trusting a single read.
    const poll = async () => {
      attempts += 1;
      // Uses the get_order_status RPC (not a direct .from('orders').select())
      // so the anon key can only ever see this one narrow status row for the
      // order_number it already knows — never the full orders table.
      const { data, error } = await supabase
        .rpc('get_order_status', { p_order_number: orderNumber })
        .single<{ order_number: string; payment_status: string; status: string }>();

      if (cancelled) return;

      if (!error && data?.payment_status === 'verified') {
        setState('verified');
        clearCart();
        return;
      }

      if (!error && data?.payment_status === 'failed') {
        setState('failed');
        return;
      }

      if (attempts >= 8) {
        // Still pending after ~16s — webhook may be delayed. Don't block
        // the customer; show a reassuring "processing" state instead.
        setState('pending');
        return;
      }

      setTimeout(poll, 2000);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [orderNumber, clearCart]);

  const canonical = `${SITE.domain.replace(/\/$/, '')}/payment/success`;

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4" style={{ background: '#FAF6F3' }}>
      <SEO
        title={`Payment Status — ${BRAND.fullName}`}
        description="Confirming your payment."
        canonical={canonical}
        siteName={BRAND.fullName}
        robots={['noindex', 'nofollow']}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md mx-auto"
      >
        {state === 'checking' && (
          <>
            <Loader2 size={48} className="text-rose-gold mx-auto mb-6 animate-spin" />
            <h1 className="heading-serif text-2xl font-bold text-charcoal mb-2">
              Confirming your payment…
            </h1>
            <p className="text-[#6B5B55] text-sm">
              Please don't close this page. This usually takes a few seconds.
            </p>
          </>
        )}

        {state === 'verified' && (
          <>
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)' }}>
              <CheckCircle size={44} className="text-green-500" />
            </div>
            <h1 className="heading-serif text-3xl font-bold text-charcoal mb-2">
              Payment Successful! 🎉
            </h1>
            <p className="text-[#6B5B55] mb-2">Thank you for your order.</p>
            {orderNumber && (
              <p className="text-sm text-[#6B5B55] mb-8">
                Order number: <strong className="text-charcoal">{orderNumber}</strong>
              </p>
            )}
            <Link to="/shop">
              <Button size="lg">Continue Shopping</Button>
            </Link>
          </>
        )}

        {state === 'pending' && (
          <>
            <Loader2 size={48} className="text-amber-500 mx-auto mb-6" />
            <h1 className="heading-serif text-2xl font-bold text-charcoal mb-2">
              Payment Processing
            </h1>
            <p className="text-[#6B5B55] text-sm mb-2">
              We're still confirming your payment with the bank. This can take
              a little longer for some transactions.
            </p>
            {orderNumber && (
              <p className="text-sm text-[#6B5B55] mb-8">
                Order number: <strong className="text-charcoal">{orderNumber}</strong> — we'll
                update your order automatically once confirmed.
              </p>
            )}
            <Link to="/shop">
              <Button variant="outline" size="lg">Back to Shop</Button>
            </Link>
          </>
        )}

        {state === 'failed' && (
          <>
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-50">
              <AlertTriangle size={44} className="text-red-500" />
            </div>
            <h1 className="heading-serif text-2xl font-bold text-charcoal mb-2">
              Payment Failed
            </h1>
            <div className="rounded-2xl p-4 mb-4 text-sm text-left"
              style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
              <p className="text-red-600 font-semibold mb-1">Your payment could not be processed.</p>
              <p className="text-[#6B5B55]">
                Your card may have been declined or the transaction was blocked by your bank.
                You have <strong>not</strong> been charged.
              </p>
            </div>
            {orderNumber && (
              <p className="text-sm text-[#6B5B55] mb-6">
                Order reference: <strong className="text-charcoal">{orderNumber}</strong>
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <Link to="/cart">
                <Button>Try Again</Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline">Contact Us</Button>
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};