/* ===================================================
   - Checkout Page
   - Single page form (no steps)
   - English labels
   - Payment method selection inline (COD / Card / SSLCommerz)
   - Review popup modal
   - Google Sheets integration
   =================================================== */
declare global { interface Window { dataLayer: any[]; } }
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, CheckCircle, ArrowLeft,
  Tag, AlertCircle, Package, X,
  CreditCard, Truck, Zap,
} from 'lucide-react';
import { useCartStore, useOrderStore, useCouponStore } from '@/store';
import { sendOrderToGoogleSheets } from '@/lib/supabase';
import type { PaymentMethod, Product, } from '@/types';
import { trackInitiateCheckout, trackPurchase, trackPageView } from '@/lib/facebookPixel';
import { SITE } from '@/config/siteConfig';
import { BRAND } from '@/config/brandingConfig';



interface BuyNowState {
  product: Product;
  size: string;
  color: string;
  quantity: number;
}

/* ─── Delivery options (renamed) ─── */
const DELIVERY_ZONES = [
  { id: 'standard', label: 'Standard Delivery', sub: '3–5 business days', charge: 80, icon: Truck },
  { id: 'express', label: 'Express Delivery', sub: '1–2 business days', charge: 150, icon: Zap },
] as const;

type DeliveryZone = typeof DELIVERY_ZONES[number]['id'];

/* ─── Country list with ISO2 + dial code (curated, extend as needed) ─── */
const COUNTRIES = [
  { iso2: 'BD', name: 'Bangladesh', dial: '+880' },
  { iso2: 'US', name: 'United States', dial: '+1' },
  { iso2: 'GB', name: 'United Kingdom', dial: '+44' },
  { iso2: 'CA', name: 'Canada', dial: '+1' },
  { iso2: 'AU', name: 'Australia', dial: '+61' },
  { iso2: 'IN', name: 'India', dial: '+91' },
  { iso2: 'PK', name: 'Pakistan', dial: '+92' },
  { iso2: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { iso2: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { iso2: 'MY', name: 'Malaysia', dial: '+60' },
  { iso2: 'SG', name: 'Singapore', dial: '+65' },
  { iso2: 'DE', name: 'Germany', dial: '+49' },
  { iso2: 'FR', name: 'France', dial: '+33' },
  { iso2: 'IT', name: 'Italy', dial: '+39' },
  { iso2: 'NL', name: 'Netherlands', dial: '+31' },
  { iso2: 'JP', name: 'Japan', dial: '+81' },
  { iso2: 'CN', name: 'China', dial: '+86' },
  { iso2: 'KR', name: 'South Korea', dial: '+82' },
  { iso2: 'QA', name: 'Qatar', dial: '+974' },
  { iso2: 'KW', name: 'Kuwait', dial: '+965' },
  { iso2: 'OM', name: 'Oman', dial: '+968' },
  { iso2: 'NP', name: 'Nepal', dial: '+977' },
  { iso2: 'LK', name: 'Sri Lanka', dial: '+94' },
] as const;

/* ─── Field wrapper ─── */
const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  hint?: string;
}> = ({ label, children, error, required, hint }) => (
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#8C7269' }}>
      {label}{required && <span style={{ color: '#B07D6B' }}> *</span>}
      {hint && <span className="ml-1 font-normal normal-case text-[11px]" style={{ color: '#A89890' }}>({hint})</span>}
    </label>
    {children}
    {error && (
      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
        className="text-xs mt-1 flex items-center gap-1" style={{ color: '#C0504D' }}>
        <AlertCircle size={11} />{error}
      </motion.p>
    )}
  </div>
);

/* ─── Styled Input ─── */
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }> = ({
  hasError, ...props
}) => (
  <input
    {...props}
    className="w-full px-4 py-2 rounded-xl text-sm outline-none transition-all"
    style={{
      background: hasError ? 'rgba(192,80,77,0.04)' : 'rgba(255,255,255,0.8)',
      border: `1.5px solid ${hasError ? 'rgba(192,80,77,0.4)' : 'rgba(176,125,107,0.2)'}`,
      color: '#2C2C2C',
    }}
    onFocus={e => {
      e.target.style.border = '1.5px solid rgba(176,125,107,0.6)';
      e.target.style.boxShadow = '0 0 0 3px rgba(176,125,107,0.1)';
    }}
    onBlur={e => {
      e.target.style.border = `1.5px solid ${hasError ? 'rgba(192,80,77,0.4)' : 'rgba(176,125,107,0.2)'}`;
      e.target.style.boxShadow = 'none';
    }}
  />
);

/* ─── Styled Select ─── */
const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }> = ({
  hasError, children, ...props
}) => (
  <select
    {...props}
    className="w-full px-4 py-2 rounded-xl text-sm outline-none transition-all bg-white"
    style={{
      border: `1.5px solid ${hasError ? 'rgba(192,80,77,0.4)' : 'rgba(176,125,107,0.2)'}`,
      color: '#2C2C2C',
    }}
  >
    {children}
  </select>
);

/* ─── Styled Textarea ─── */
const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    rows={3}
    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
    style={{
      background: 'rgba(255,255,255,0.8)',
      border: '1.5px solid rgba(176,125,107,0.2)',
      color: '#2C2C2C',
    }}
    onFocus={e => {
      e.target.style.border = '1.5px solid rgba(176,125,107,0.6)';
      e.target.style.boxShadow = '0 0 0 3px rgba(176,125,107,0.1)';
    }}
    onBlur={e => {
      e.target.style.border = '1.5px solid rgba(176,125,107,0.2)';
      e.target.style.boxShadow = 'none';
    }}
  />
);

/* ════════════════════════════════════════
   MAIN COMPONENT
   (wrapped in <Elements> further below so it
   can call useStripe()/useElements())
════════════════════════════════════════ */
const CheckoutForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, getSubtotal, getDiscount, clearCart } = useCartStore();
  const { coupons, loadCoupons } = useCouponStore();
  React.useEffect(() => { loadCoupons(); }, [loadCoupons]);
  const { placeOrder } = useOrderStore();

  React.useEffect(() => {
  trackPageView();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const buyNow = location.state as BuyNowState | null;

  const checkoutItems = useMemo(() => {
    if (buyNow?.product) {
      return [{ product: buyNow.product, selectedSize: buyNow.size, selectedColor: buyNow.color, quantity: buyNow.quantity }];
    }
    return items;
  }, [buyNow, items]);

  const subtotal = useMemo(() => {
    if (buyNow?.product) return buyNow.product.price * buyNow.quantity;
    return getSubtotal();
  }, [buyNow, getSubtotal]);

  // If the user applies a NEW coupon at Checkout, the Cart-page coupon
  // (the `discount` line, from cartStore.getDiscount()) is suppressed
  // so the two can't both subtract from the total at once.
  const [cartCouponOverridden, setCartCouponOverridden] = useState(false);

  const discount = buyNow ? 0 : (cartCouponOverridden ? 0 : getDiscount());

  // Form — fullName, phone (with separate dial code), country, city, state (optional), postCode, addressLine
  const [form, setForm] = useState({
    fullName: '',
    dialCode: '+880',
    phone: '',
    country: 'BD',
    city: '',
    state: '',
    postCode: '',
    addressLine: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form | 'deliveryZone', string>>>({});
  const updateForm = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Refs for scroll-to-error
  const fullNameRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const postCodeRef = useRef<HTMLDivElement>(null);
  const addressLineRef = useRef<HTMLDivElement>(null);
  const deliveryZoneRef = useRef<HTMLDivElement>(null);
  const cardholderRef = useRef<HTMLDivElement>(null);

  // Auto-detect country / dial code from user's location (best-effort; user can change it)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch('https://ipapi.co/json/');
        const data = await resp.json();
        const detected = COUNTRIES.find(c => c.iso2 === data?.country_code);
        if (!cancelled && detected) {
          setForm(prev => ({ ...prev, country: detected.iso2, dialCode: detected.dial }));
        }
      } catch {
        // silent fallback — keep default (Bangladesh)
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // When country changes manually, keep dial code in sync unless user already edited it independently.
  const handleCountryChange = (iso2: string) => {
    const c = COUNTRIES.find(c => c.iso2 === iso2);
    setForm(prev => ({ ...prev, country: iso2, dialCode: c ? c.dial : prev.dialCode }));
    setErrors(prev => ({ ...prev, country: '' }));
  };

  // Delivery
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone | ''>('');
  const shippingCharge = deliveryZone ? DELIVERY_ZONES.find(z => z.id === deliveryZone)!.charge : 0;

  // Payment — bKash & Nagad removed
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const selectPaymentMethod = (m: PaymentMethod) => { setPaymentMethod(m); setGatewayError(''); };

  const [gatewayError, setGatewayError] = useState('');

  // SSLCommerz extra info
  const [sslEmail, setSslEmail] = useState('');

  // Coupon
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  // cartCouponOverridden is declared above (near `discount`) since it's
  // needed there too — see the comment above its declaration.

  const applyCoupon = () => {
    setCouponError('');
    const code = couponInput.trim();

    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    const coupon = coupons.find(
      (c) => c.code.toLowerCase() === code.toLowerCase() && c.isActive,
    );

    if (!coupon) {
      setCouponError('Invalid coupon code.');
      return;
    }
    if (new Date(coupon.expiresAt) < new Date()) {
      setCouponError('This coupon has expired.');
      return;
    }
    if (coupon.usedCount >= coupon.maxUses) {
      setCouponError('This coupon has reached its usage limit.');
      return;
    }
    if (subtotal < coupon.minOrderAmount) {
      setCouponError(`Minimum order amount is ${SITE.currency.symbol}${coupon.minOrderAmount}`);
      return;
    }

    const discountAmt = coupon.type === 'percentage'
      ? Math.round((subtotal * coupon.discount) / 100)
      : Math.min(coupon.discount, subtotal);

    setCouponDiscount(discountAmt);
    setCouponApplied(true);
    setCartCouponOverridden(true);
  };

  const total = subtotal - discount - couponDiscount + shippingCharge;

  // Review popup
  const [showReview, setShowReview] = useState(false);

  // Order placed
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [placing, setPlacing] = useState(false);

  const scrollToRef = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  // Validation — returns true if valid; otherwise sets errors and scrolls to the first invalid field
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!form.fullName.trim()) newErrors.fullName = 'Please enter your full name.';
    if (!form.phone.trim()) newErrors.phone = 'Please enter your mobile number.';
    if (!form.country.trim()) newErrors.country = 'Please select your country.';
    if (!form.city.trim()) newErrors.city = 'Please enter your city.';
    if (!form.postCode.trim()) newErrors.postCode = 'Please enter your post/zip code.';
    if (!form.addressLine.trim()) newErrors.addressLine = 'Please enter your address.';
    if (!deliveryZone) newErrors.deliveryZone = 'Please select a delivery option.';

    setErrors(newErrors);

    // Order of fields top-to-bottom — scroll to the first one that failed.
    const order: Array<[boolean, React.RefObject<HTMLDivElement | null>]> = [
      [!!newErrors.fullName, fullNameRef],
      [!!newErrors.phone, phoneRef],
      [!!newErrors.country, countryRef],
      [!!newErrors.city, cityRef],
      [!!newErrors.postCode, postCodeRef],
      [!!newErrors.addressLine, addressLineRef],
      [!!newErrors.deliveryZone, deliveryZoneRef],
    ];
    const firstInvalid = order.find(([invalid]) => invalid);
    if (firstInvalid) {
      scrollToRef(firstInvalid[1]);
      return false;
    }

    return true;
  };

  const handleReviewOrder = () => {
    if (validate()) {
      trackInitiateCheckout(total);

      /* GTM DATA LAYER — begin_checkout */
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ ecommerce: null });
      window.dataLayer.push({
        event: 'begin_checkout',
        ecommerce: {
          currency: SITE.currency.code,
          value: total,
          items: checkoutItems.map(item => ({
            item_id: item.product.id,
            item_name: item.product.name,
            item_category: item.product.category,
            price: item.product.price,
            quantity: item.quantity,
          })),
        },
      });

      setShowReview(true);
    }
  };


  // Place order //
const handlePlaceOrder = async () => {
  console.log('[checkout] handlePlaceOrder fired', { placing, deliveryZone, paymentMethod });
  if (placing) return; // guard against double-fire on mobile
  setPlacing(true);
    const num = `${BRAND.orderPrefix}-${Date.now().toString().slice(-6)}`;
    const [firstName, ...rest] = form.fullName.trim().split(' ');
    const lastName = rest.join(' ');

    const isGatewayPayment = paymentMethod === 'sslcommerz';
    const countryName = COUNTRIES.find(c => c.iso2 === form.country)?.name || form.country;

    const orderData = {
      id: Date.now().toString(),
      orderNumber: num,
      status: 'pending' as const,
      paymentStatus: 'pending' as const,
      paymentMethod,
      couponCode: couponApplied ? couponInput.trim().toUpperCase() : undefined,
      subtotal,
      shippingCharge,
      discount: discount + couponDiscount,
      total,
      notes: form.notes || '-',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customer: {
        firstName,
        lastName,
        email: '',
        phone: `${form.dialCode} ${form.phone}`,
        address: form.addressLine,
        city: form.city,
        state: form.state || '',
        postCode: form.postCode,
        country: countryName,
        district: DELIVERY_ZONES.find(z => z.id === deliveryZone)?.label || '',
      },
      items: checkoutItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.images?.[0] || '',
        size: item.selectedSize,
        color: item.selectedColor,
        quantity: item.quantity,
        price: item.product.price,
      })),
    };

    try {
      await placeOrder(orderData);
    } catch (err) {
      console.error('Order failed', err);
      setPlacing(false);
      return;
    }

    // ── Stripe / SSLCommerz: order is saved as pending, now hand off to
    //    the gateway. Payment confirmation happens via webhook, NOT here —
    //    so we don't mark the order complete or clear the cart yet.
    if (isGatewayPayment) {
      try {
        if (paymentMethod === 'sslcommerz') {
          const resp = await fetch('/api/sslcommerz-init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderNumber: num,
              amount: total,
              customer: {
                name: form.fullName,
                phone: `${form.dialCode} ${form.phone}`,
                email: sslEmail || undefined,
                address: form.addressLine,
                city: form.city,
              },
            }),
          });
          const data = await resp.json();
          if (!resp.ok || !data.url) throw new Error(data.error || 'SSLCommerz session failed');
          window.location.href = data.url;
          return;
        }
      } catch (err) {
        console.error('Gateway payment failed', err);
        setPlacing(false);
        setShowReview(false);
        const message = err instanceof Error && err.message
          ? err.message
          : 'Payment gateway could not be reached. Please check your connection and try again, or choose a different payment method.';
        setGatewayError(message);
        return;
      }
    }

    trackPurchase(total);

    /* GTM DATA LAYER — purchase */
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({
      event: 'purchase',
      ecommerce: {
        transaction_id: num,
        currency: SITE.currency.code,
        value: total,
        shipping: shippingCharge,
        coupon: couponApplied ? couponInput.trim().toUpperCase() : undefined,
        items: checkoutItems.map(item => ({
          item_id: item.product.id,
          item_name: item.product.name,
          item_category: item.product.category,
          price: item.product.price,
          quantity: item.quantity,
        })),
      },
    });

    // Send to Google Sheets
    try {
      await sendOrderToGoogleSheets(orderData as Record<string, unknown>);
    } catch {
      // don't block order
    }

    setOrderNumber(num);
    setOrderPlaced(true);
    setShowReview(false);
    if (!buyNow) clearCart();
    setPlacing(false);
  };

  // Redirect if empty
  if (checkoutItems.length === 0 && !orderPlaced) {
    navigate('/cart');
    return null;
  }

  /* ── ORDER CONFIRMED ── */
  if (orderPlaced) {
    return (
      <>
        <Helmet>
          <title>Checkout | Shiny Shades</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>

        <div className="min-h-screen pt-24 pb-16 flex items-center justify-center" style={{ background: '#FAF6F3' }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md mx-auto px-4">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)' }}>
              <CheckCircle size={44} className="text-green-500" />
            </motion.div>
            <h1 className="heading-serif text-3xl font-bold text-charcoal mb-2">
              {paymentMethod === 'stripe' || paymentMethod === 'sslcommerz' ? 'Order Saved' : 'Order Placed! 🎉'}
            </h1>
            <p className="text-warm-gray mb-2">Thank you for your order</p>
            <p className="text-sm text-warm-gray mb-6">
              Order Number: <strong className="text-charcoal">{orderNumber}</strong>
            </p>
            <div className="rounded-2xl p-5 mb-6 text-sm text-warm-gray text-left"
              style={{ background: 'rgba(176,125,107,0.08)', border: '1px solid rgba(176,125,107,0.2)' }}>
              {paymentMethod === 'cod'
                ? '✅ Please pay in cash upon delivery.'
                : paymentMethod === 'stripe' || paymentMethod === 'sslcommerz'
                  ? '⚠️ We could not reach the payment page. Please contact us or try again.'
                  : '✅ Your payment will be verified within 24 hours.'}
            </div>

            <button
              onClick={() => navigate('/shop')}
              className="px-8 py-3 rounded-2xl font-semibold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #B07D6B, #C4956A)' }}>
              Continue Shopping
            </button>
          </motion.div>
        </div>
      </>
    );
  }



  return (
    <div className="min-h-screen pt-20 pb-16" style={{ background: '#FAF6F3' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)}
            className="p-2 rounded-xl" style={{ background: 'rgba(176,125,107,0.1)', color: '#B07D6B' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="heading-serif text-2xl font-bold text-charcoal">Checkout</h1>
            <p className="text-xs text-[#6B5B55]">Complete your order</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl p-5 md:p-5 space-y-3"
          style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(176,125,107,0.15)' }}>

          {/* ── Order Summary (top) ── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#B07D6B' }}>
              <Package size={12} className="inline mr-1" />
              Your Order ({checkoutItems.length} item{checkoutItems.length > 1 ? 's' : ''})
            </p>
            <div className="space-y-2">
              {checkoutItems.map(item => (
                <div key={`${item.product.id}-${item.selectedSize}`}
                  className="flex items-center gap-2 p-2.5 rounded-xl"
                  style={{ background: 'rgba(176,125,107,0.05)' }}>
                  {item.product.images?.[0]?.startsWith('http') ? (
                    <img src={item.product.images[0]} alt={item.product.name}
                      className="w-11 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-12 rounded-lg flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #F0E0D6, #E8D0C4)' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">{item.product.name}</p>
                    <p className="text-xs text-[#6B5B55]">{item.selectedSize} • {item.selectedColor} × {item.quantity}</p>
                  </div>
                  <p className="text-sm font-bold flex-shrink-0" style={{ color: '#B07D6B' }}>
                    {SITE.currency.symbol}{(item.product.price * item.quantity).toFixed(0)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px" style={{ background: 'rgba(176,125,107,0.15)' }} />

          {/* ── Shipping Info ── */}
          <div className="space-y-2">
            <p className="text-[15px] font-bold text-[#2B2B2B]">📦 Delivery Information</p>

            <div ref={fullNameRef}>
              <Field label="Full Name" required error={errors.fullName}>
                <Input
                  value={form.fullName}
                  onChange={e => updateForm('fullName', e.target.value)}
                  placeholder="Your full name"
                  hasError={!!errors.fullName}
                />
              </Field>
            </div>

            <div ref={phoneRef}>
              <Field label="Mobile Number" required error={errors.phone}>
                <div className="flex gap-2">
                  <select
                    value={form.dialCode}
                    onChange={e => updateForm('dialCode', e.target.value)}
                    className="px-3 py-2 rounded-xl text-sm outline-none bg-white flex-shrink-0"
                    style={{ border: '1.5px solid rgba(176,125,107,0.2)', color: '#2C2C2C', width: '110px' }}
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.iso2} value={c.dial}>{c.iso2} {c.dial}</option>
                    ))}
                  </select>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={e => updateForm('phone', e.target.value)}
                    placeholder="Mobile number"
                    hasError={!!errors.phone}
                  />
                </div>
                <p className="text-[11px] mt-1" style={{ color: '#A89890' }}>
                  Country code is auto-detected from your location — change it if needed.
                </p>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div ref={countryRef}>
                <Field label="Country" required error={errors.country}>
                  <Select
                    value={form.country}
                    onChange={e => handleCountryChange(e.target.value)}
                    hasError={!!errors.country}
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.iso2} value={c.iso2}>{c.name}</option>
                    ))}
                  </Select>
                  <p className="text-[11px] mt-1" style={{ color: '#A89890' }}>Auto-detected, editable.</p>
                </Field>
              </div>

              <div ref={cityRef}>
                <Field label="City" required error={errors.city}>
                  <Input
                    value={form.city}
                    onChange={e => updateForm('city', e.target.value)}
                    placeholder="City"
                    hasError={!!errors.city}
                  />
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="State / Province" hint="optional">
                <Input
                  value={form.state}
                  onChange={e => updateForm('state', e.target.value)}
                  placeholder="State / Province"
                />
              </Field>

              <div ref={postCodeRef}>
                <Field label="Post Code / Zip Code" required error={errors.postCode}>
                  <Input
                    value={form.postCode}
                    onChange={e => updateForm('postCode', e.target.value)}
                    placeholder="Post / Zip code"
                    hasError={!!errors.postCode}
                  />
                </Field>
              </div>
            </div>

            <div ref={addressLineRef}>
              <Field label="Address Line" required error={errors.addressLine}>
                <Textarea
                  value={form.addressLine}
                  onChange={e => updateForm('addressLine', e.target.value)}
                  placeholder="House/flat, road, area"
                />
              </Field>
            </div>

            {/* Delivery options (renamed) */}
            <div ref={deliveryZoneRef}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8C7269' }}>
                Delivery Option <span style={{ color: '#e87c55' }}>*</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                {DELIVERY_ZONES.map(zone => {
                  const Icon = zone.icon;
                  return (
                    <motion.button key={zone.id} type="button"
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { setDeliveryZone(zone.id); setErrors(p => ({ ...p, deliveryZone: '' })); }}
                      className="text-left p-3 rounded-2xl transition-all"
                      style={{
                        border: deliveryZone === zone.id ? '2px solid #B07D6B' : '1.5px solid rgba(176,125,107,0.2)',
                        background: deliveryZone === zone.id ? 'rgba(176,125,107,0.08)' : 'rgba(255,255,255,0.6)',
                      }}>
                      <Icon size={20} style={{ color: '#B07D6B' }} />
                      <p className="font-semibold text-sm mt-1" style={{ color: '#2C2C2C' }}>{zone.label}</p>
                      <p className="text-[11px]" style={{ color: '#9A8880' }}>{zone.sub}</p>
                      <p className="text-sm font-bold mt-1" style={{ color: '#B07D6B' }}>{SITE.currency.symbol}{zone.charge}</p>
                    </motion.button>
                  );
                })}
              </div>
              {errors.deliveryZone && (
                <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#C0504D' }}>
                  <AlertCircle size={11} />{errors.deliveryZone}
                </p>
              )}
            </div>

            {/* Notes */}
            <Field label="Special Instructions" hint="optional">
              <Textarea
                value={form.notes}
                onChange={e => updateForm('notes', e.target.value)}
                placeholder="Anything else we should know..."
              />
            </Field>
          </div>

          <div className="h-px" style={{ background: 'rgba(176,125,107,0.15)' }} />

          {/* ── Payment Method ── */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-charcoal">💳 Payment Method</p>
            <div className="space-y-2">

              {/* ── Cash on Delivery ── */}
              <div className="rounded-2xl overflow-hidden"
                style={{ border: paymentMethod === 'cod' ? '2px solid #B07D6B' : '1.5px solid rgba(176,125,107,0.35)' }}>
                <button onClick={() => selectPaymentMethod('cod')}
                  className="w-full flex items-center gap-3 p-3 text-left transition-all"
                  style={{ background: paymentMethod === 'cod' ? 'rgba(176,125,107,0.10)' : 'rgba(255,255,255,0.85)' }}>
                  <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: paymentMethod === 'cod' ? '#B07D6B' : '#ccc' }}>
                    {paymentMethod === 'cod' && <div className="w-4 h-4 rounded-full" style={{ background: '#B07D6B' }} />}
                  </div>
                  <Truck size={18} style={{ color: '#B07D6B' }} />
                  <div className="flex-1">
                    <p className="font-semibold text-[14px] text-[#2A2A2A]">Cash on Delivery</p>
                    <p className="text-xs text-[#6B5B55]">Pay when you receive your order</p>
                  </div>
                </button>
                <AnimatePresence>
                  {paymentMethod === 'cod' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 pt-2"
                        style={{ background: 'rgba(176,125,107,0.04)', borderTop: '1px solid rgba(176,125,107,0.15)' }}>
                        <p className="text-sm text-[#6C5A54] flex items-center gap-2">
                          <CheckCircle size={15} className="text-green-500 flex-shrink-0" />
                          Pay {SITE.currency.symbol}{total.toFixed(0)} on delivery. No advance payment needed.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>


              {/* 
              {/* ── SSLCommerz ── 
              <div className="rounded-2xl overflow-hidden"
                style={{ border: paymentMethod === 'sslcommerz' ? '2px solid #B07D6B' : '1.5px solid rgba(176,125,107,0.35)' }}>
                <button onClick={() => selectPaymentMethod('sslcommerz')}
                  className="w-full flex items-center gap-3 p-3 text-left transition-all"
                  style={{ background: paymentMethod === 'sslcommerz' ? 'rgba(176,125,107,0.10)' : 'rgba(255,255,255,0.85)' }}>
                  <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: paymentMethod === 'sslcommerz' ? '#B07D6B' : '#ccc' }}>
                    {paymentMethod === 'sslcommerz' && <div className="w-4 h-4 rounded-full" style={{ background: '#B07D6B' }} />}
                  </div>
                  <Shield size={18} style={{ color: '#B07D6B' }} />
                  <div className="flex-1">
                    <p className="font-semibold text-[14px] text-[#2A2A2A]">SSLCommerz</p>
                    <p className="text-xs text-[#6B5B55]">Pay via local cards, mobile banking & more</p>
                  </div>
                </button>
                <AnimatePresence>
                  {paymentMethod === 'sslcommerz' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 pb-4 pt-3 space-y-3"
                        style={{ background: 'rgba(176,125,107,0.04)', borderTop: '1px solid rgba(176,125,107,0.15)' }}>
                        <Field label="Email" hint="optional, for payment receipt">
                          <Input
                            type="email"
                            value={sslEmail}
                            onChange={e => setSslEmail(e.target.value)}
                            placeholder="you@example.com"
                          />
                        </Field>
                        <p className="text-xs text-[#6C5A54]">You'll be redirected to a secure SSLCommerz page to complete payment.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>*/}
            </div>*
          </div>

          <div className="h-px" style={{ background: 'rgba(176,125,107,0.15)' }} />

          {/* ── Coupon ── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#8C7269' }}>
              <Tag size={11} className="inline mr-1" />Coupon Code <span style={{ fontWeight: 400 }}>(optional)</span>
            </p>
            <div className="flex gap-2">
              <input value={couponInput}
                onChange={e => { setCouponInput(e.target.value); setCouponError(''); if (couponApplied) { setCouponApplied(false); setCouponDiscount(0); setCartCouponOverridden(false); } }}
                placeholder="Enter coupon code"
                className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.8)', border: `1.5px solid ${couponError ? 'rgba(192,80,77,0.4)' : couponApplied ? 'rgba(74,140,92,0.4)' : 'rgba(176,125,107,0.2)'}`, color: '#2C2C2C' }}
                onKeyDown={e => e.key === 'Enter' && applyCoupon()}
              />
              <button onClick={applyCoupon}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: couponApplied ? 'rgba(74,140,92,0.15)' : 'rgba(176,125,107,0.15)', color: couponApplied ? '#4A8C5C' : '#B07D6B', border: 'none', cursor: 'pointer' }}>
                {couponApplied ? '✓ Applied' : 'Apply'}
              </button>
            </div>
            {couponError && <p className="text-xs mt-1" style={{ color: '#C0504D' }}>{couponError}</p>}
            {couponApplied && <p className="text-xs mt-1" style={{ color: '#4A8C5C' }}>✓ You saved {SITE.currency.symbol}{couponDiscount}!</p>}
          </div>

          <div className="h-px" style={{ background: 'rgba(176,125,107,0.15)' }} />

          {/* ── Price Summary ── */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-warm-gray">Subtotal</span>
              <span className="font-medium">{SITE.currency.symbol}{subtotal.toFixed(0)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between" style={{ color: '#4A8C5C' }}>
                <span>Discount</span><span>−{SITE.currency.symbol}{discount.toFixed(0)}</span>
              </div>
            )}
            {couponApplied && couponDiscount > 0 && (
              <div className="flex justify-between" style={{ color: '#4A8C5C' }}>
                <span>Coupon Discount</span><span>−{SITE.currency.symbol}{couponDiscount.toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-warm-gray">Delivery Charge</span>
              <span className="font-medium" style={{ color: '#B07D6B' }}>
                {deliveryZone ? `${SITE.currency.symbol}${shippingCharge}` : 'Select an option'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2"
              style={{ borderTop: '1px solid rgba(176,125,107,0.15)' }}>
              <span className="font-bold text-charcoal text-base">Total</span>
              <span className="heading-serif text-2xl font-bold" style={{ color: '#B07D6B' }}>{SITE.currency.symbol}{total.toFixed(0)}</span>
            </div>
          </div>

          {/* ── Review Order Button ── */}
<motion.button
  type="button"
  onClick={handleReviewOrder}
  whileTap={{ scale: 0.97 }}
  className="w-full py-4 rounded-2xl font-bold text-sm tracking-wider uppercase text-white"
  style={{
    background: 'linear-gradient(135deg, #B07D6B 0%, #C4956A 50%, #B07D6B 100%)',
    border: 'none',
    cursor: 'pointer',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  }}>
  Review Order →
</motion.button>

          {/* Gateway error popup */}
          <AnimatePresence>
            {gatewayError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)' }}>
                <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-600 mb-0.5">Payment Error</p>
                  <p className="text-xs text-red-500">{gatewayError}</p>
                </div>
                <button onClick={() => setGatewayError('')} className="text-red-400 hover:text-red-600">
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 text-xs" style={{ color: '#9A8880' }}>
            <Shield size={12} style={{ color: '#B07D6B' }} />
            Secure Checkout • SSL Encrypted
          </div>
        </div>
      </div>

      {/* ════ REVIEW POPUP MODAL ════ */}
      <AnimatePresence>
        {showReview && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
className="fixed inset-0 z-50 flex items-center justify-center p-4"
style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', touchAction: 'manipulation' }}
onPointerUp={e => { if (e.target === e.currentTarget) setShowReview(false); }}>
  <motion.div
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
             className="w-full max-w-md rounded-3xl overflow-hidden"
style={{
  background: '#FDF8F5',
  maxHeight: '90vh',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
  touchAction: 'pan-y',
}}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 sticky top-0"
                style={{ background: '#FDF8F5', borderBottom: '1px solid rgba(176,125,107,0.15)' }}>
                <h2 className="heading-serif text-lg font-bold text-charcoal">Confirm Your Order</h2>
                <button onClick={() => setShowReview(false)}
                  className="p-1.5 rounded-lg" style={{ background: 'rgba(176,125,107,0.1)', color: '#B07D6B' }}>
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4">

                {/* Customer Info */}
                <div className="rounded-2xl p-4"
                  style={{ background: 'rgba(176,125,107,0.06)', border: '1px solid rgba(176,125,107,0.15)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#B07D6B' }}>📍 Delivery Information</p>
                  <p className="text-sm font-semibold text-charcoal">{form.fullName}</p>
                  <p className="text-sm text-warm-gray">{form.dialCode} {form.phone}</p>
                  <p className="text-sm text-warm-gray">
                    {form.addressLine}{form.city ? `, ${form.city}` : ''}{form.state ? `, ${form.state}` : ''} {form.postCode}
                  </p>
                  <p className="text-sm text-warm-gray">{COUNTRIES.find(c => c.iso2 === form.country)?.name}</p>
                  <p className="text-xs mt-1 font-medium" style={{ color: '#B07D6B' }}>
                    {DELIVERY_ZONES.find(z => z.id === deliveryZone)?.label} — {SITE.currency.symbol}{shippingCharge}
                  </p>
                </div>

                {/* Payment Info */}
                <div className="rounded-2xl p-4"
                  style={{ background: 'rgba(176,125,107,0.06)', border: '1px solid rgba(176,125,107,0.15)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#B07D6B' }}>💳 Payment</p>
                  <p className="text-sm text-charcoal">
                    {paymentMethod === 'cod' ? 'Cash on Delivery' : 'SSLCommerz'}
                  </p>
                </div>

                {/* Items */}
                <div className="rounded-2xl p-4"
                  style={{ background: 'rgba(176,125,107,0.06)', border: '1px solid rgba(176,125,107,0.15)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#B07D6B' }}>🛍️ Order Items</p>
                  <div className="space-y-2">
                    {checkoutItems.map(item => (
                      <div key={item.product.id} className="flex items-center gap-3">
                        <div className="w-10 h-12 rounded-lg overflow-hidden flex-shrink-0"
                          style={{ background: 'rgba(176,125,107,0.1)' }}>
                          {item.product.images?.[0]?.startsWith('http') && (
                            <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-charcoal truncate">{item.product.name}</p>
                          <p className="text-xs text-[#6B5B55]">{item.selectedSize} • x{item.quantity}</p>
                        </div>
                        <p className="text-sm font-bold flex-shrink-0" style={{ color: '#B07D6B' }}>
                          {SITE.currency.symbol}{(item.product.price * item.quantity).toFixed(0)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center px-1">
                  <span className="font-bold text-charcoal">Total Amount</span>
                  <span className="heading-serif text-xl font-bold" style={{ color: '#B07D6B' }}>{SITE.currency.symbol}{total.toFixed(0)}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowReview(false)}
                    className="flex-1 py-3.5 rounded-2xl font-semibold text-sm"
                    style={{ background: 'rgba(176,125,107,0.1)', color: '#B07D6B', border: 'none', cursor: 'pointer' }}>
                    ← Back
                  </button>
<motion.button
  type="button"
  onPointerUp={(e) => {
    e.stopPropagation();
    handlePlaceOrder();
  }}
  disabled={placing}
  whileTap={{ scale: 0.97 }}
  className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white"
  style={{
    background: placing ? 'rgba(176,125,107,0.5)' : 'linear-gradient(135deg, #B07D6B, #C4956A)',
    border: 'none',
    cursor: placing ? 'not-allowed' : 'pointer',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  }}>
  {placing ? 'Processing...' : `Place Order — ${SITE.currency.symbol}${total.toFixed(0)}`}
</motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const CheckoutPage: React.FC = CheckoutForm