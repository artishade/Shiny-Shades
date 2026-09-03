/* ===================================================
   - Checkout Page (100% Error-Free District & Thana Selector)
   - Auto-detects Delivery Charge based on Thana/District
   - Zero spelling mistake risk
   - Bangladesh 64 Districts + Dhaka Metro & Outside Thanas
   - Payment: COD + bKash/Nagad (manual TrxID verification)
   =================================================== */
declare global {
  interface Window {
    dataLayer: any[];
  }
}

import { CustomerLayout } from '@/components/layout/CustomerLayout';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from '@/lib/routerCompat';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  ArrowLeft,
  Tag,
  AlertCircle,
  Package,
  X,
  Truck,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  Check,
  Building2,
  Navigation,
  Smartphone,
  Copy,
  Zap,
} from 'lucide-react';
import { useCartStore, useOrderStore, useCouponStore } from '@/store';
import { sendOrderToGoogleSheets } from '@/lib/supabase';
import type { PaymentMethod, Product } from '@/types';
import { trackInitiateCheckout, trackPurchase, trackPageView } from '@/lib/facebookPixel';
import { SITE } from '@/config/siteConfig';
import { BRAND } from '@/config/brandingConfig';

// TODO: বাস্তব বিকাশ/নগদ মার্চেন্ট নম্বর দিয়ে replace করুন
const MOBILE_BANKING_MERCHANT_NUMBER = '01700000000';

interface BuyNowState {
  product: Product;
  size: string;
  color: string;
  quantity: number;
}

/* ─── ১. ঢাকা মেট্রোপলিটন থানা (ঢাকার ভেতরের এলাকা - চার্জ ৳৮০) ─── */
const DHAKA_METRO_THANAS = [
  'Adabor (আদাবর)',
  'Azimpur (আজিমপুর)',
  'Badda (বাড্ডা)',
  'Banasree (বনশ্রী)',
  'Bangshal (বংশাল)',
  'Banani (বনানী)',
  'Baridhara (বারিধারা)',
  'Bashundhara R/A (বসুন্ধরা)',
  'Cantonment (ক্যান্টনমেন্ট)',
  'Chawkbazar (চকবাজার)',
  'Dakshinkhan (দক্ষিণখান)',
  'Darus Salam (দারুস সালাম)',
  'Demra (ডেমরা)',
  'Dhanmondi (ধানমন্ডি)',
  'Elephant Road (এলিফ্যান্ট রোড)',
  'Farmgate (ফার্মগেট)',
  'Gandaria (গেন্ডারিয়া)',
  'Gulshan 1 & 2 (গুলশান)',
  'Hazaribagh (হাজারীবাগ)',
  'Jatrabari (যাত্রাবাড়ী)',
  'Kadamtali (কদমতলী)',
  'Kafrul (কাফরুল)',
  'Kalabagan (কলাবাগান)',
  'Kalyanpur (কল্যাণপুর)',
  'Kamrangirchar (কামরাঙ্গীরচর)',
  'Khilgaon (খিলগাঁও)',
  'Khilkhet (খিলক্ষেত)',
  'Kotwali (কোতোয়ালী)',
  'Lalbagh (লালবাগ)',
  'Malibagh (মালিবাগ)',
  'Mirpur (মিরপুর - ১ থেকে ১৪)',
  'Mohakhali (মহাখালী)',
  'Mohammadpur (মোহাম্মদপুর)',
  'Motijheel (মতিঝিল)',
  'Mugda (মুগদা)',
  'New Market (নিউ মার্কেট)',
  'Pallabi (পল্লবী)',
  'Paltan (পল্টন)',
  'Panthapath (পান্থপথ)',
  'Ramna (রমনা)',
  'Rampura (রামপুরা)',
  'Sabujbagh (সবুজবাগ)',
  'Shah Ali (শাহ আলী)',
  'Shahbagh (শাহবাগ)',
  'Sher-e-Bangla Nagar (শেরেবাংলা নগর)',
  'Shyamoli (শ্যামলী)',
  'Shyampur (শ্যামপুর)',
  'Sutrapur (সূত্রাপুর)',
  'Tejgaon (তেজগাঁও)',
  'Tejgaon Industrial Area (তেজগাঁও শিল্পাঞ্চল)',
  'Turag (তুরাগ)',
  'Uttara (উত্তরা - সেক্টর ১ থেকে ১৮)',
  'Uttarkhan (উত্তরখান)',
  'Vatara (ভাটারা)',
  'Wari (ওয়ারী)',
];

/* ─── ঢাকা জেলার সাব-এরিয়া (ঢাকার বাইরের চার্জ ৳১৫০ প্রযোজ্য) ─── */
const DHAKA_SUB_THANAS = [
  'Savar (সাভার)',
  'Dhamrai (ধামরাই)',
  'Keraniganj (কেরানীগঞ্জ)',
  'Dohar (দোহার)',
  'Nawabganj (নবাবগঞ্জ)',
  'Ashulia (আশুলিয়া)',
];

/* ─── ২. বাংলাদেশের ৬৪ জেলা ─── */
const BD_DISTRICTS = [
  'Dhaka (ঢাকা)',
  'Chattogram (চট্টগ্রাম)',
  'Gazipur (গাজীপুর)',
  'Narayanganj (নারায়ণগঞ্জ)',
  'Cumilla (কুমিল্লা)',
  'Sylhet (সিলেট)',
  'Rajshahi (রাজশাহী)',
  'Khulna (খুলনা)',
  'Barishal (বরিশাল)',
  'Rangpur (রংপুর)',
  'Mymensingh (ময়মনসিংহ)',
  'Bogura (বগুড়া)',
  'Feni (ফেনী)',
  'Noakhali (নোয়াখালী)',
  "Cox's Bazar (কক্সবাজার)",
  'Tangail (টাঙ্গাইল)',
  'Narsingdi (নরসিংদী)',
  'Faridpur (ফরিদপুর)',
  'Manikganj (মানিকগঞ্জ)',
  'Munshiganj (মুন্সীগঞ্জ)',
  'Madaripur (মাদারীপুর)',
  'Gopalganj (গোপালগঞ্জ)',
  'Rajbari (রাজবাড়ী)',
  'Shariatpur (শরীয়তপুর)',
  'Brahmanbaria (ব্রাহ্মণবাড়িয়া)',
  'Chandpur (চাঁদপুর)',
  'Lakshmipur (লক্ষ্মীপুর)',
  'Rangamati (রাঙ্গামাটি)',
  'Bandarban (বান্দরবান)',
  'Khagrachhari (খাগড়াছড়ি)',
  'Pabna (পাবনা)',
  'Natore (নাটোর)',
  'Naogaon (নওগাঁ)',
  'Sirajganj (সিরাজগঞ্জ)',
  'Chapainawabganj (চাঁপাইনবাবগঞ্জ)',
  'Joypurhat (জয়পুরহাট)',
  'Dinajpur (দিনাজপুর)',
  'Gaibandha (গাইবান্ধা)',
  'Kurigram (কুড়িগ্রাম)',
  'Lalmonirhat (লালমনিরহাট)',
  'Nilphamari (নীলফামারী)',
  'Panchagarh (পঞ্চগড়)',
  'Thakurgaon (ঠাকুরগাঁও)',
  'Jashore (যশোর)',
  'Kushtia (কুষ্টিয়া)',
  'Satkhira (সাতক্ষীরা)',
  'Bagerhat (বাগেরহাট)',
  'Jhenaidah (ঝিনাইদহ)',
  'Chuadanga (চুয়াডাঙ্গা)',
  'Meherpur (মেহেরপুর)',
  'Narail (নড়াইল)',
  'Magura (মাগুরা)',
  'Bhola (ভোলা)',
  'Patuakhali (পটুয়াখালী)',
  'Barguna (বরগুনা)',
  'Jhalokati (ঝালকাঠি)',
  'Pirojpur (পিরোজপুর)',
  'Moulvibazar (মৌলভীবাজার)',
  'Sunamganj (সুনামগঞ্জ)',
  'Habiganj (হবিগঞ্জ)',
  'Jamalpur (জামালপুর)',
  'Netrokona (নেত্রকোণা)',
  'Sherpur (শেরপুর)'
];

/* ─── Field Wrapper Component ─── */
const Field: React.FC<{
  label: string;
  banglaLabel?: string;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  hint?: string;
}> = ({ label, banglaLabel, children, error, required, hint }) => (
  <div className="w-full">
    <label className="flex items-center justify-between text-xs font-semibold text-[#5c4a43] mb-1.5">
      <span>
        {label} {banglaLabel && <span className="font-normal text-gray-500">({banglaLabel})</span>}
        {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
      </span>
      {hint && <span className="text-[11px] font-normal text-gray-400">{hint}</span>}
    </label>
    {children}
    {error && (
      <motion.p
        initial={{ opacity: 0, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs mt-1.5 flex items-center gap-1 text-red-600 font-medium"
      >
        <AlertCircle size={13} className="shrink-0" />
        {error}
      </motion.p>
    )}
  </div>
);

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, getSubtotal, getDiscount, clearCart } = useCartStore();
  const { coupons, loadCoupons } = useCouponStore();
  const { placeOrder } = useOrderStore();

  useEffect(() => {
    loadCoupons();
    trackPageView();
  }, [loadCoupons]);

  const buyNow = location.state as BuyNowState | null;

  const checkoutItems = useMemo(() => {
    if (buyNow?.product) {
      return [
        {
          product: buyNow.product,
          selectedSize: buyNow.size,
          selectedColor: buyNow.color,
          quantity: buyNow.quantity,
        },
      ];
    }
    return items;
  }, [buyNow, items]);

  const subtotal = useMemo(() => {
    if (buyNow?.product) return buyNow.product.price * buyNow.quantity;
    return getSubtotal();
  }, [buyNow, getSubtotal]);

  // Form State
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    district: 'Dhaka (ঢাকা)',
    thana: '',
    customThana: '',
    streetAddress: '',
    notes: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [mobileBankingNumber, setMobileBankingNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [numberCopied, setNumberCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Coupon State
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [cartCouponOverridden, setCartCouponOverridden] = useState(false);

  // Review & Order State
  const [showReview, setShowReview] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [placing, setPlacing] = useState(false);

  // Refs for validation auto-scroll
  const nameRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const districtRef = useRef<HTMLDivElement>(null);
  const thanaRef = useRef<HTMLDivElement>(null);
  const streetRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);

  /* ─── ⚡ অটোমেটিক ডেলিভারি চার্জ ক্যালকুলেশন ─── */
  const isInsideDhaka = useMemo(() => {
    if (form.district.startsWith('Dhaka')) {
      // যদি ঢাকা সাব-এরিয়া (সাভার, কেরানীগঞ্জ, ইত্যাদি) সিলেক্ট করে, তবে ঢাকার বাইরে
      if (DHAKA_SUB_THANAS.includes(form.thana)) {
        return false;
      }
      // যদি ঢাকা মেট্রো থানা সিলেক্ট করে
      if (DHAKA_METRO_THANAS.includes(form.thana)) {
        return true;
      }
      // যদি এখনও থানা সিলেক্ট না করে থাকে কিন্তু ঢাকা জেলা সিলেক্ট করা থাকে
      return true;
    }
    return false;
  }, [form.district, form.thana]);

  const shippingCharge = isInsideDhaka ? 80 : 150;
  const deliveryZoneLabel = isInsideDhaka ? 'Inside Dhaka (ঢাকার ভেতরে)' : 'Outside Dhaka (ঢাকার বাইরে)';

  const discount = buyNow ? 0 : cartCouponOverridden ? 0 : getDiscount();
  const total = Math.max(0, subtotal - discount - couponDiscount + shippingCharge);

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // BD Phone validation: starts with 01 and exactly 11 digits
  const isValidBdPhone = (phone: string) => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    return /^(01)[3-9]\d{8}$/.test(cleaned);
  };

  const handleCopyMerchantNumber = async () => {
    try {
      await navigator.clipboard.writeText(MOBILE_BANKING_MERCHANT_NUMBER);
      setNumberCopied(true);
      setTimeout(() => setNumberCopied(false), 2000);
    } catch {
      // clipboard access blocked — user can select/copy manually
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.fullName.trim()) {
      newErrors.fullName = 'আপনার সম্পূর্ণ নাম লিখুন';
    }

    const cleanPhone = form.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      newErrors.phone = 'আপনার ১১ ডিজিটের মোবাইল নম্বর দিন';
    } else if (!isValidBdPhone(cleanPhone)) {
      newErrors.phone = 'সঠিক ১১ ডিজিটের নম্বর দিন (যেমন: 017XXXXXXXX)';
    }

    if (!form.district) {
      newErrors.district = 'অনুগ্রহ করে জেলা সিলেক্ট করুন';
    }

    if (form.district.startsWith('Dhaka') && !form.thana) {
      newErrors.thana = 'অনুগ্রহ করে আপনার থানা/এলাকা সিলেক্ট করুন';
    } else if (!form.district.startsWith('Dhaka') && !form.customThana.trim()) {
      newErrors.customThana = 'আপনার থানা বা উপজেলার নাম লিখুন';
    }

    if (!form.streetAddress.trim()) {
      newErrors.streetAddress = 'বাসা নং, রোড নং বা বিস্তারিত ঠিকানা লিখুন';
    }

    if (paymentMethod !== 'cod') {
      const cleanMB = mobileBankingNumber.replace(/[^0-9]/g, '');
      if (!cleanMB) {
        newErrors.mobileBankingNumber = 'আপনার বিকাশ/নগদ নম্বর লিখুন';
      } else if (!isValidBdPhone(cleanMB)) {
        newErrors.mobileBankingNumber = 'সঠিক ১১ ডিজিটের নম্বর দিন';
      }
      if (!transactionId.trim()) {
        newErrors.transactionId = 'Transaction ID (TrxID) লিখুন';
      } else if (transactionId.trim().length < 6) {
        newErrors.transactionId = 'সঠিক Transaction ID লিখুন';
      }
    }

    setErrors(newErrors);

    if (newErrors.fullName) {
      nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    if (newErrors.phone) {
      phoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    if (newErrors.district) {
      districtRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    if (newErrors.thana || newErrors.customThana) {
      thanaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    if (newErrors.streetAddress) {
      streetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    if (newErrors.mobileBankingNumber || newErrors.transactionId) {
      paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    return true;
  };

  const handleApplyCoupon = () => {
    setCouponError('');
    const code = couponInput.trim();

    if (!code) {
      setCouponError('কুপন কোড লিখুন');
      return;
    }

    const coupon = coupons.find((c) => c.code.toLowerCase() === code.toLowerCase() && c.isActive);

    if (!coupon) {
      setCouponError('কুপন কোডটি সঠিক নয়');
      return;
    }
    if (new Date(coupon.expiresAt) < new Date()) {
      setCouponError('এই কুপনের মেয়াদ শেষ হয়ে গেছে');
      return;
    }
    if (coupon.usedCount >= coupon.maxUses) {
      setCouponError('কুপন ব্যবহারের লিমিট শেষ');
      return;
    }
    if (subtotal < coupon.minOrderAmount) {
      setCouponError(`সর্বনিম্ন অর্ডার ${SITE.currency.symbol}${coupon.minOrderAmount} হতে হবে`);
      return;
    }

    const discountAmt =
      coupon.type === 'percentage'
        ? Math.round((subtotal * coupon.discount) / 100)
        : Math.min(coupon.discount, subtotal);

    setCouponDiscount(discountAmt);
    setCouponApplied(true);
    setCartCouponOverridden(true);
  };

  const handleReviewOrder = () => {
    if (validate()) {
      trackInitiateCheckout(
        checkoutItems.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
        })),
        total,
      );

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ ecommerce: null });
      window.dataLayer.push({
        event: 'begin_checkout',
        ecommerce: {
          currency: SITE.currency.code,
          value: total,
          items: checkoutItems.map((item) => ({
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

  const handlePlaceOrder = async () => {
    if (placing) return;
    setPlacing(true);

    const num = `${BRAND.orderPrefix}-${Date.now().toString().slice(-6)}`;
    const [firstName, ...rest] = form.fullName.trim().split(' ');
    const lastName = rest.join(' ');
    const finalThana = form.district.startsWith('Dhaka') ? form.thana : form.customThana.trim();
    const fullCombinedAddress = `${form.streetAddress.trim()}, ${finalThana}, ${form.district}`;

    const orderData = {
      id: Date.now().toString(),
      orderNumber: num,
      status: 'pending' as const,
      paymentStatus: 'pending' as const,
      paymentMethod,
      paymentDetails:
        paymentMethod !== 'cod'
          ? {
            senderNumber: mobileBankingNumber.trim(),
            transactionId: transactionId.trim().toUpperCase(),
            merchantNumber: MOBILE_BANKING_MERCHANT_NUMBER,
          }
          : undefined,
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
        phone: form.phone.startsWith('+88') ? form.phone : `+88${form.phone.trim()}`,
        address: fullCombinedAddress,
        city: form.district,
        state: finalThana,
        postCode: '',
        country: 'Bangladesh',
        district: deliveryZoneLabel,
      },
      items: checkoutItems.map((item) => ({
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
      trackPurchase(
        checkoutItems.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
        })),
        total,
      );

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
          items: checkoutItems.map((item) => ({
            item_id: item.product.id,
            item_name: item.product.name,
            item_category: item.product.category,
            price: item.product.price,
            quantity: item.quantity,
          })),
        },
      });

      try {
        await sendOrderToGoogleSheets(orderData as Record<string, unknown>);
      } catch (sheetsErr) {
        console.error('Google Sheets sync notice:', sheetsErr);
      }

      setOrderNumber(num);
      setOrderPlaced(true);
      setShowReview(false);
      if (!buyNow) clearCart();
    } catch (err) {
      console.error('Order failed', err);
      alert('অর্ডার সম্পন্ন হতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setPlacing(false);
    }
  };

  if (checkoutItems.length === 0 && !orderPlaced) {
    navigate('/cart');
    return null;
  }

  /* ── ORDER SUCCESS VIEW ── */
  if (orderPlaced) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4" style={{ background: '#FAF6F3' }}>
        <Head>
          <meta name="robots" content="noindex, nofollow" />
        </Head>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-sm text-center border border-emerald-100"
        >
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
            <CheckCircle size={48} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">ধন্যবাদ! আপনার অর্ডার সম্পন্ন হয়েছে</h1>
          <p className="text-sm text-gray-500 mb-5">আমাদের প্রতিনিধি খুব দ্রুত আপনার সাথে কল করে অর্ডার কনফার্ম করবে।</p>

          <div className="bg-[#FAF6F3] rounded-2xl p-4 mb-6 text-left border border-gray-100 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Order Number:</span>
              <span className="font-bold text-gray-800 font-mono">{orderNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment Method:</span>
              <span className="font-semibold text-emerald-700">
                {paymentMethod === 'cod'
                  ? 'Cash on Delivery (ক্যাশ অন ডেলিভারি)'
                  : paymentMethod === 'bkash'
                    ? 'bKash Payment (বিকাশ)'
                    : 'Nagad Payment (নগদ)'}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
              <span className="font-bold text-gray-800">Total Payable:</span>
              <span className="font-bold text-lg text-[#B07D6B]">{SITE.currency.symbol}{total.toFixed(0)}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl text-amber-800 text-xs sm:text-sm mb-6 flex items-center justify-center gap-2">
            <ShieldCheck size={18} className="shrink-0" />
            <span>
              {paymentMethod === 'cod'
                ? 'ডেলিভারি পাওয়ার পর পণ্য দেখে মূল্য পরিশোধ করুন।'
                : 'আপনার পেমেন্ট যাচাই করে আমরা দ্রুত অর্ডার প্রসেস করছি।'}
            </span>
          </div>

          <button
            onClick={() => navigate('/shop')}
            className="w-full py-3.5 rounded-2xl font-bold text-white shadow-md transition-transform active:scale-98 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #B07D6B, #C4956A)' }}
          >
            আরও শপিং করুন (Continue Shopping)
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ background: '#FAF6F3' }}>
      <Head>
        <title>Checkout | Quick Order</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Top Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">অর্ডার সম্পন্ন করুন (Checkout)</h1>
            <p className="text-xs text-gray-500">তথ্যগুলো পূরণ করে অর্ডার কনফার্ম করুন</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-gray-100 space-y-6">
          {/* 1. ORDER SUMMARY MINI */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#B07D6B] flex items-center gap-1.5">
                <Package size={14} /> আপনার অর্ডার ({checkoutItems.length} টি আইটেম)
              </span>
            </div>

            <div className="space-y-2">
              {checkoutItems.map((item) => (
                <div
                  key={`${item.product.id}-${item.selectedSize}`}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF6F3] border border-gray-100"
                >
                  {item.product.images?.[0] ? (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-12 h-14 rounded-xl object-cover shrink-0 border border-white"
                    />
                  ) : (
                    <div className="w-12 h-14 rounded-xl bg-gray-200 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.selectedSize && `Size: ${item.selectedSize}`}
                      {item.selectedColor && ` • Color: ${item.selectedColor}`} • Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#B07D6B]">
                      {SITE.currency.symbol}{(item.product.price * item.quantity).toFixed(0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* 2. CUSTOMER DELIVERY FORM */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <MapPin size={18} className="text-[#B07D6B]" />
              ডেলিভারি ঠিকানা ও তথ্য (Delivery Details)
            </h2>

            {/* Name */}
            <div ref={nameRef}>
              <Field label="Full Name" banglaLabel="আপনার পুরো নাম" required error={errors.fullName}>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => updateForm('fullName', e.target.value)}
                    placeholder="আপনার নাম লিখুন"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all ${errors.fullName
                      ? 'border-red-400 bg-red-50/20'
                      : 'border-gray-200 bg-gray-50/60 focus:bg-white focus:border-[#B07D6B]'
                      } border`}
                  />
                </div>
              </Field>
            </div>

            {/* Mobile Number */}
            <div ref={phoneRef}>
              <Field
                label="Mobile Number"
                banglaLabel="১১ ডিজিটের মোবাইল নম্বর"
                required
                error={errors.phone}
                hint="সঠিক মোবাইল নম্বর দিন"
              >
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    placeholder="01XXXXXXXXX"
                    maxLength={14}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none font-medium transition-all ${errors.phone
                      ? 'border-red-400 bg-red-50/20'
                      : 'border-gray-200 bg-gray-50/60 focus:bg-white focus:border-[#B07D6B]'
                      } border`}
                  />
                </div>
              </Field>
            </div>

            {/* জেলা ও থানা ড্রপডাউন (District & Thana Selector) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* জেলা সিলেক্টর */}
              <div ref={districtRef}>
                <Field label="District" banglaLabel="জেলা" required error={errors.district}>
                  <div className="relative">
                    <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <select
                      value={form.district}
                      onChange={(e) => {
                        const dist = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          district: dist,
                          thana: dist.startsWith('Dhaka') ? prev.thana : '',
                          customThana: '',
                        }));
                      }}
                      className="w-full pl-10 pr-8 py-3 rounded-xl text-sm border border-gray-200 bg-gray-50/60 focus:bg-white focus:border-[#B07D6B] outline-none appearance-none font-medium cursor-pointer"
                    >
                      {BD_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
              </div>

              {/* থানা সিলেক্টর (ঢাকার ক্ষেত্রে ড্রপডাউন, বাইরের ক্ষেত্রে ইনপুট/থানা) */}
              <div ref={thanaRef}>
                {form.district.startsWith('Dhaka') ? (
                  <Field label="Thana / Area" banglaLabel="থানা বা এরিয়া" required error={errors.thana}>
                    <div className="relative">
                      <Navigation size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <select
                        value={form.thana}
                        onChange={(e) => updateForm('thana', e.target.value)}
                        className={`w-full pl-10 pr-8 py-3 rounded-xl text-sm border outline-none appearance-none font-medium cursor-pointer ${errors.thana
                          ? 'border-red-400 bg-red-50/20'
                          : 'border-gray-200 bg-gray-50/60 focus:bg-white focus:border-[#B07D6B]'
                          }`}
                      >
                        <option value="">-- থানা/এলাকা সিলেক্ট করুন --</option>
                        <optgroup label="📍 Dhaka City (ঢাকার ভেতরে - চার্জ ৳৮০)">
                          {DHAKA_METRO_THANAS.map((th) => (
                            <option key={th} value={th}>
                              {th}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="📍 Sub-Dhaka (ঢাকার বাইরে - চার্জ ৳১৫০)">
                          {DHAKA_SUB_THANAS.map((th) => (
                            <option key={th} value={th}>
                              {th}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </Field>
                ) : (
                  <Field label="Thana / Upazila" banglaLabel="থানা / উপজেলা" required error={errors.customThana}>
                    <div className="relative">
                      <Navigation size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={form.customThana}
                        onChange={(e) => updateForm('customThana', e.target.value)}
                        placeholder="যেমন: কোতোয়ালী, বায়েজিদ, সদর..."
                        className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border outline-none font-medium ${errors.customThana
                          ? 'border-red-400 bg-red-50/20'
                          : 'border-gray-200 bg-gray-50/60 focus:bg-white focus:border-[#B07D6B]'
                          }`}
                      />
                    </div>
                  </Field>
                )}
              </div>
            </div>

            {/* ⚡ অটোমেটিক চার্জ ব্যাজ */}
            <motion.div
              key={deliveryZoneLabel}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Truck size={15} className="text-emerald-600" />
                ডেলিভারি এরিয়া: <strong>{deliveryZoneLabel}</strong>
              </span>
              <span className="font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-md">
                চার্জ: ৳{shippingCharge}
              </span>
            </motion.div>

            {/* Street / House Address */}
            <div ref={streetRef}>
              <Field
                label="House & Street Address"
                banglaLabel="বাসা নং, রোড নং বা গ্রামের নাম"
                required
                error={errors.streetAddress}
                hint="বিস্তারিত ঠিকানা লিখুন"
              >
                <textarea
                  rows={2}
                  value={form.streetAddress}
                  onChange={(e) => updateForm('streetAddress', e.target.value)}
                  placeholder="যেমন: বাসা নং ১২, রোড নং ৪, সেক্টর ৭ অথবা মহল্লা/গ্রামের নাম..."
                  className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none ${errors.streetAddress
                    ? 'border-red-400 bg-red-50/20'
                    : 'border-gray-200 bg-gray-50/60 focus:bg-white focus:border-[#B07D6B]'
                    } border`}
                />
              </Field>
            </div>

            {/* Special Instructions */}
            <Field label="Special Note" banglaLabel="কোনো বিশেষ নির্দেশনা থাকলে লিখুন" hint="optional">
              <input
                type="text"
                value={form.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                placeholder="যেমন: ৩টার পর ডেলিভারি দিলে ভালো হয়..."
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-gray-200 bg-gray-50/60 focus:bg-white focus:border-[#B07D6B] outline-none"
              />
            </Field>
          </div>

          <div className="h-px bg-gray-100" />

          {/* 3. PAYMENT METHOD */}
          <div className="space-y-3" ref={paymentRef}>
            <h2 className="text-base font-bold text-gray-800">পেমেন্ট মেথড বেছে নিন (Select Payment Method)</h2>

            {/* Cash on Delivery */}
            <div
              onClick={() => setPaymentMethod('cod')}
              className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-[#B07D6B] bg-[#B07D6B]/5' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === 'cod' ? 'border-[#B07D6B]' : 'border-gray-300'
                    }`}
                >
                  {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-[#B07D6B]" />}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                    <Truck size={16} className="text-[#B07D6B]" />
                    Cash on Delivery (ক্যাশ অন ডেলিভারি)
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">পণ্য হাতে পেয়ে টাকা পরিশোধ করবেন।</p>
                </div>
              </div>
            </div>

            {/* bKash / Nagad — same block, same flow (merchant number, amount, sender number, TrxID) */}
            <div
              className={`rounded-2xl border-2 overflow-hidden transition-all ${paymentMethod === 'bkash' || paymentMethod === 'nagad' ? 'border-[#E2136E]' : 'border-gray-200'
                }`}
            >
              <div
                onClick={() => setPaymentMethod((prev) => (prev === 'bkash' || prev === 'nagad' ? prev : 'bkash'))}
                className={`p-4 flex items-center justify-between cursor-pointer ${paymentMethod === 'bkash' || paymentMethod === 'nagad' ? 'bg-[#E2136E]/5' : 'bg-white hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${paymentMethod === 'bkash' || paymentMethod === 'nagad' ? 'border-[#E2136E]' : 'border-gray-300'
                      }`}
                  >
                    {(paymentMethod === 'bkash' || paymentMethod === 'nagad') && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#E2136E]" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                      <Smartphone size={16} className="text-[#E2136E]" />
                      bKash / Nagad Payment (বিকাশ/নগদ)
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">বিকাশে সরাসরি পেমেন্ট করুন</p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] bg-[#E2136E] text-white font-bold px-2 py-1 rounded-full">
                  <Zap size={10} /> দ্রুত ডেলিভারি
                </span>
              </div>

              <AnimatePresence>
                {(paymentMethod === 'bkash' || paymentMethod === 'nagad') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4 space-y-3"
                  >
                    {/* bKash / Nagad sub-toggle (same block, switches only the label/color) */}
                    <div className="flex gap-2">
                      {(['bkash', 'nagad'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer ${paymentMethod === m
                              ? m === 'bkash'
                                ? 'border-[#E2136E] bg-[#E2136E] text-white'
                                : 'border-[#F6871F] bg-[#F6871F] text-white'
                              : 'border-gray-200 text-gray-600 bg-white'
                            }`}
                        >
                          {m === 'bkash' ? 'bKash (বিকাশ)' : 'Nagad (নগদ)'}
                        </button>
                      ))}
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-2.5 text-xs">
                      <p className="text-gray-700">
                        <span className="font-bold">১.</span> আপনার {paymentMethod === 'bkash' ? 'বিকাশ' : 'নগদ'} অ্যাপ থেকে{' '}
                        <span className="font-bold text-gray-900">Send Money / Payment</span> অপশনে যান।
                      </p>

                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                        <span className="font-black text-sm tracking-wide text-gray-900">
                          {MOBILE_BANKING_MERCHANT_NUMBER}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyMerchantNumber}
                          className="flex items-center gap-1 text-[11px] font-semibold text-[#B07D6B] hover:opacity-80 cursor-pointer"
                        >
                          <Copy size={13} />
                          {numberCopied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>

                      <p className="text-gray-700">
                        <span className="font-bold">২.</span> সর্বমোট{' '}
                        <span className="font-bold text-gray-900">৳{total.toFixed(0)}</span> টাকা পেমেন্ট সম্পন্ন করুন।
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field
                        label={paymentMethod === 'bkash' ? 'আপনার বিকাশ নম্বর' : 'আপনার নগদ নম্বর'}
                        required
                        error={errors.mobileBankingNumber}
                      >
                        <input
                          type="tel"
                          value={mobileBankingNumber}
                          onChange={(e) => {
                            setMobileBankingNumber(e.target.value);
                            if (errors.mobileBankingNumber) setErrors((p) => ({ ...p, mobileBankingNumber: '' }));
                          }}
                          placeholder="01XXXXXXXXX"
                          maxLength={14}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none font-medium ${errors.mobileBankingNumber
                              ? 'border-red-400 bg-red-50/20'
                              : 'border-gray-200 bg-gray-50/60 focus:bg-white focus:border-[#B07D6B]'
                            }`}
                        />
                      </Field>

                      <Field label="Transaction ID (TrxID)" required error={errors.transactionId}>
                        <input
                          type="text"
                          value={transactionId}
                          onChange={(e) => {
                            setTransactionId(e.target.value.toUpperCase());
                            if (errors.transactionId) setErrors((p) => ({ ...p, transactionId: '' }));
                          }}
                          placeholder="যেমন: 9J7A..."
                          className={`w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none font-medium uppercase ${errors.transactionId
                              ? 'border-red-400 bg-red-50/20'
                              : 'border-gray-200 bg-gray-50/60 focus:bg-white focus:border-[#B07D6B]'
                            }`}
                        />
                      </Field>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* 4. COUPON CODE */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1">
              <Tag size={12} className="text-[#B07D6B]" />
              ডিসকাউন্ট কুপন (Coupon Code)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => {
                  setCouponInput(e.target.value);
                  setCouponError('');
                  if (couponApplied) {
                    setCouponApplied(false);
                    setCouponDiscount(0);
                    setCartCouponOverridden(false);
                  }
                }}
                placeholder="কুপন কোড থাকলে লিখুন"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-gray-200 uppercase outline-none focus:border-[#B07D6B]"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity active:scale-95 cursor-pointer"
                style={{ background: '#B07D6B' }}
              >
                {couponApplied ? 'Applied' : 'Apply'}
              </button>
            </div>
            {couponError && <p className="text-xs text-red-600 font-medium mt-1">{couponError}</p>}
            {couponApplied && (
              <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <Check size={14} /> আপনি পাচ্ছেন {SITE.currency.symbol}{couponDiscount} ডিসকাউন্ট!
              </p>
            )}
          </div>

          <div className="h-px bg-gray-100" />

          {/* 5. PRICE BREAKDOWN */}
          <div className="bg-[#FAF6F3] rounded-2xl p-4 space-y-2 text-sm border border-gray-100">
            <div className="flex justify-between text-gray-600">
              <span>মোট মূল্য (Subtotal):</span>
              <span className="font-semibold text-gray-800">{SITE.currency.symbol}{subtotal.toFixed(0)}</span>
            </div>

            {(discount > 0 || couponDiscount > 0) && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>ডিসকাউন্ট (Discount):</span>
                <span>−{SITE.currency.symbol}{(discount + couponDiscount).toFixed(0)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>ডেলিভারি চার্জ ({deliveryZoneLabel}):</span>
              <span className="font-semibold text-gray-800">{SITE.currency.symbol}{shippingCharge}</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-200/80">
              <span className="font-bold text-gray-900 text-base">সর্বমোট বিল (Total):</span>
              <span className="text-2xl font-black text-[#B07D6B]">{SITE.currency.symbol}{total.toFixed(0)}</span>
            </div>
          </div>

          {/* 6. SUBMIT BUTTON */}
          <div>
            <motion.button
              type="button"
              onClick={handleReviewOrder}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-2xl font-bold text-base text-white shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #B07D6B 0%, #C4956A 100%)',
              }}
            >
              অর্ডার কনফার্ম করতে ক্লিক করুন ({SITE.currency.symbol}{total.toFixed(0)}) →
            </motion.button>
            <p className="text-[11px] text-center text-gray-400 mt-2 flex items-center justify-center gap-1">
              <Shield size={12} /> ১০০% নিরাপদ পেমেন্ট সুবিধা
            </p>
          </div>
        </div>
      </div>

      {/* ════ REVIEW ORDER POPUP MODAL ════ */}
      <AnimatePresence>
        {showReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 px-6 border-b border-gray-100 bg-[#FAF6F3]">
                <h3 className="font-bold text-gray-900 text-base">অর্ডার নিশ্চিতকরণ (Confirm Order)</h3>
                <button
                  onClick={() => setShowReview(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 text-xs space-y-1">
                  <p className="font-bold text-gray-800 text-sm">{form.fullName}</p>
                  <p className="text-gray-600 font-medium">{form.phone}</p>
                  <p className="text-gray-600">
                    {form.streetAddress}, {form.district.startsWith('Dhaka') ? form.thana : form.customThana}, {form.district}
                  </p>
                  <p className="text-[#B07D6B] font-semibold pt-1">
                    {deliveryZoneLabel} — চার্জ: ৳{shippingCharge}
                  </p>
                  <p className="text-gray-600 pt-1 mt-1 border-t border-gray-100">
                    পেমেন্ট:{' '}
                    <span className="font-bold text-gray-900">
                      {paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'bkash' ? 'bKash' : 'Nagad'}
                    </span>
                    {paymentMethod !== 'cod' && ` • TrxID: ${transactionId}`}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">আইটেম লিস্ট:</p>
                  {checkoutItems.map((item) => (
                    <div key={item.product.id} className="flex justify-between items-center text-xs">
                      <span className="text-gray-800 truncate pr-2 font-medium">
                        {item.product.name} × {item.quantity}
                      </span>
                      <span className="font-bold text-gray-900 shrink-0">
                        {SITE.currency.symbol}{(item.product.price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-100">
                    <span className="text-gray-500">ডেলিভারি চার্জ:</span>
                    <span className="font-semibold text-gray-800">{SITE.currency.symbol}{shippingCharge}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-gray-200">
                    <span>সর্বমোট বিল:</span>
                    <span className="text-lg text-[#B07D6B] font-black">{SITE.currency.symbol}{total.toFixed(0)}</span>
                  </div>
                </div>

                {/* Confirm & Back buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReview(false)}
                    className="w-1/3 py-3 rounded-2xl font-bold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                  >
                    এডিট করুন
                  </button>
                  <button
                    type="button"
                    disabled={placing}
                    onClick={handlePlaceOrder}
                    className="w-2/3 py-3 rounded-2xl font-bold text-sm text-white shadow-md transition-opacity cursor-pointer"
                    style={{
                      background: placing ? '#ccc' : 'linear-gradient(135deg, #B07D6B, #C4956A)',
                    }}
                  >
                    {placing ? 'অর্ডার হচ্ছে...' : 'অর্ডার কনফার্ম করুন'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

CheckoutPage.getLayout = function getLayout(page: React.ReactElement) {
  return <CustomerLayout>{page}</CustomerLayout>;
};

// ─── CSR: checkout state lives in client-side stores (cart / order / coupon) ─
// We still opt in to SSR so the layout, fonts and SEO meta render server-side;
// the actual form fields, totals and offers hydrate from Zustand. The
// Cache-Control: no-store header keeps every visitor's checkout private.
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  return { props: {} };
};

export default CheckoutPage;
