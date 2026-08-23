// ===================================================
// POST /api/sslcommerz-callback?status=success|fail|cancel|ipn
//
// SSLCommerz calls this in two ways:
//   1. Browser redirect (success_url/fail_url/cancel_url) — the customer's
//      browser lands here after paying. NOT fully trustworthy alone.
//   2. Server-to-server IPN (ipn_url) — SSLCommerz's own servers call this
//      directly. This is the trustworthy confirmation.
//
// Both paths re-validate the transaction with SSLCommerz's Validation API
// before marking an order as paid — this prevents anyone from spoofing a
// success redirect to fake a payment.
//
// Required environment variables:
//   SSLCOMMERZ_STORE_ID
//   SSLCOMMERZ_STORE_PASSWORD
//   SSLCOMMERZ_IS_SANDBOX
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   PUBLIC_SITE_URL
// ===================================================

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const {
    SSLCOMMERZ_STORE_ID,
    SSLCOMMERZ_STORE_PASSWORD,
    SSLCOMMERZ_IS_SANDBOX,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    PUBLIC_SITE_URL,
  } = process.env;

  const siteUrl = (PUBLIC_SITE_URL || `https://${req.headers.host}`).replace(/\/$/, '');
  const statusParam = String(req.query.status || '');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[sslcommerz-callback] Missing Supabase env vars');
    return res.status(500).send('Server not configured');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // SSLCommerz posts as application/x-www-form-urlencoded; Vercel parses
  // this into req.body automatically for POST requests.
  const body = req.body || {};
  const tranId = body.tran_id || req.query.tran_id;
  const valId = body.val_id;

  // Cancel/fail from the browser redirect — not cryptographically verified by SSLCommerz,
  // so we only allow it to move a still-pending order to failed (can't be used to
  // overwrite an order that's already verified or already failed).
  if (statusParam === 'cancel' || statusParam === 'fail') {
    if (tranId) {
      await supabase
        .from('orders')
        .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
        .eq('order_number', tranId)
        .eq('payment_status', 'pending');
    }
    return res.redirect(302, `${siteUrl}/payment/cancel?order=${encodeURIComponent(tranId || '')}`);
  }

  // success or ipn — re-validate with SSLCommerz before trusting it.
  try {
    if (!valId || !tranId) {
      console.error('[sslcommerz-callback] Missing val_id/tran_id', body);
      return statusParam === 'ipn'
        ? res.status(400).send('Missing validation id')
        : res.redirect(302, `${siteUrl}/payment/cancel?order=${encodeURIComponent(tranId || '')}`);
    }

    const isSandbox = SSLCOMMERZ_IS_SANDBOX !== 'false';
    const validationUrl = isSandbox
      ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
      : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';

    const params = new URLSearchParams({
      val_id: valId,
      store_id: SSLCOMMERZ_STORE_ID,
      store_passwd: SSLCOMMERZ_STORE_PASSWORD,
      format: 'json',
    });

    const verifyRes = await fetch(`${validationUrl}?${params.toString()}`);
    const verifyData = await verifyRes.json();

    const isValid =
      (verifyData.status === 'VALID' || verifyData.status === 'VALIDATED') &&
      verifyData.tran_id === tranId;

    // Idempotency guard — SSLCommerz IPN can fire more than once.
    if (isValid && valId) {
      const { error: dupeError } = await supabase
        .from('processed_webhook_events')
        .insert({ id: valId, provider: 'sslcommerz' });

      if (dupeError && dupeError.code !== '23505') {
        console.error('[sslcommerz-callback] Dedup insert error:', dupeError);
      }
      if (dupeError && dupeError.code === '23505') {
        // already processed — still respond appropriately below
      }
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: isValid ? 'verified' : 'failed',
        transaction_id: verifyData.bank_tran_id || tranId,
        gateway_session_id: valId,
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', tranId);

    if (updateError) {
      console.error('[sslcommerz-callback] Failed to update order:', updateError);
    }

    if (statusParam === 'ipn') {
      // IPN expects a plain 200 OK, no redirect.
      return res.status(200).send('IPN received');
    }

    // Browser redirect path
    return isValid
      ? res.redirect(302, `${siteUrl}/payment/success?order=${encodeURIComponent(tranId)}`)
      : res.redirect(302, `${siteUrl}/payment/cancel?order=${encodeURIComponent(tranId)}`);
  } catch (err) {
    console.error('[sslcommerz-callback]', err);
    return statusParam === 'ipn'
      ? res.status(500).send('Validation error')
      : res.redirect(302, `${siteUrl}/payment/cancel?order=${encodeURIComponent(tranId || '')}`);
  }
}
