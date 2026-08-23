// ===================================================
// POST /api/sslcommerz-init
//
// Initiates an SSLCommerz payment session for an order already saved
// to Supabase with payment_status = 'pending'. SSLCommerz is a plain
// REST API, so no SDK is needed — we just POST form data and get back
// a GatewayPageURL to redirect the customer to.
//
// Required environment variables:
//   SSLCOMMERZ_STORE_ID
//   SSLCOMMERZ_STORE_PASSWORD
//   SSLCOMMERZ_IS_SANDBOX        'true' while testing, 'false' when live
//   PUBLIC_SITE_URL              e.g.https://shinyshades.vercel.app/
// ===================================================
import { checkRateLimit, getClientIp } from './_lib/rateLimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    SSLCOMMERZ_STORE_ID,
    SSLCOMMERZ_STORE_PASSWORD,

    SSLCOMMERZ_IS_SANDBOX,
    PUBLIC_SITE_URL,
  } = process.env;

  const ip = getClientIp(req);
  const allowed = await checkRateLimit(`sslcommerz-init:${ip}`, 5, 60);
  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
  }

  if (!SSLCOMMERZ_STORE_ID || !SSLCOMMERZ_STORE_PASSWORD) {
    return res.status(500).json({ error: 'SSLCommerz is not configured on the server.' });
  }

  try {
    const { orderNumber, amount, customer } = req.body || {};

    if (!orderNumber || typeof orderNumber !== 'string') {
      return res.status(400).json({ error: 'orderNumber is required.' });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'A valid positive amount is required.' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: orderRow, error: orderErr } = await supabase
      .from('orders')
      .select('total, payment_status')
      .eq('order_number', orderNumber)
      .single();

    if (orderErr || !orderRow) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (orderRow.payment_status === 'verified') {
      return res.status(409).json({ error: 'This order has already been paid.' });
    }
    if (Math.round(orderRow.total * 100) !== Math.round(amount * 100)) {
      return res.status(400).json({ error: 'Amount does not match order total.' });
    }

    const siteUrl = (PUBLIC_SITE_URL || `https://${req.headers.host}`).replace(/\/$/, '');
    const isSandbox = SSLCOMMERZ_IS_SANDBOX !== 'false';
    const apiUrl = isSandbox
      ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

    const payload = new URLSearchParams({
      store_id: SSLCOMMERZ_STORE_ID,
      store_passwd: SSLCOMMERZ_STORE_PASSWORD,
      total_amount: String(amount),
      currency: 'BDT',
      tran_id: orderNumber, // unique transaction id — we reuse the order number
      // SSLCommerz calls these directly, server-to-server, when payment finishes —
      // this is the trustworthy confirmation, same role as the Stripe webhook.
      success_url: `${siteUrl}/api/sslcommerz-callback?status=success`,
      fail_url: `${siteUrl}/api/sslcommerz-callback?status=fail`,
      cancel_url: `${siteUrl}/api/sslcommerz-callback?status=cancel`,
      ipn_url: `${siteUrl}/api/sslcommerz-callback?status=ipn`,

      // Customer info — SSLCommerz requires these fields
      cus_name: customer?.name || 'Customer',
      cus_email: customer?.email || 'no-reply@example.com',
      cus_add1: customer?.address || 'N/A',
      cus_city: customer?.city || 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: customer?.phone || 'N/A',

      shipping_method: 'NO',
      product_name: `Order ${orderNumber}`,
      product_category: 'Fashion',
      product_profile: 'general',
    });

    const sslResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
    });

    const data = await sslResponse.json();

    if (data.status !== 'SUCCESS' || !data.GatewayPageURL) {
      console.error('[sslcommerz-init] Gateway rejected request:', data);
      return res.status(502).json({ error: 'SSLCommerz could not start the payment session.' });
    }

    return res.status(200).json({ url: data.GatewayPageURL });
  } catch (err) {
    console.error('[sslcommerz-init]', err);
    return res.status(500).json({ error: 'Failed to initiate SSLCommerz session.' });
  }
}
