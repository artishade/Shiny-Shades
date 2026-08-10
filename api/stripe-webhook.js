// ===================================================
// POST /api/stripe-webhook
//
// Stripe calls this URL directly (server-to-server) when a Checkout
// session completes. This is the ONLY trustworthy signal that a payment
// actually succeeded — never trust the browser redirect alone, since
// anyone could visit /payment/success?order=XYZ manually without paying.
//
// Setup (after deploying):
//   1. Stripe Dashboard > Developers > Webhooks > Add endpoint
//   2. Endpoint URL: https://yourdomain.com/api/stripe-webhook
//   3. Events to send: checkout.session.completed,
//      payment_intent.succeeded, payment_intent.payment_failed
//   4. Copy the "Signing secret" (whsec_...) into STRIPE_WEBHOOK_SECRET
//
// Required environment variables:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET     e.g. whsec_...
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   (NOT the anon key — needs write access,
//                                 keep this secret, server-only)
// ===================================================

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Vercel needs the raw request body to verify Stripe's signature,
// so we disable the default JSON body parser for this route.
export const config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }

  const {
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } = process.env;

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] Missing Stripe env vars');
    return res.status(500).send('Server not configured');
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[stripe-webhook] Missing Supabase env vars');
    return res.status(500).send('Server not configured');
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let event;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook signature verification failed.`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderNumber = session.client_reference_id || session.metadata?.orderNumber;

      if (!orderNumber) {
        console.error('[stripe-webhook] No orderNumber on session', session.id);
        return res.status(200).json({ received: true }); // ack so Stripe stops retrying
      }

      // Idempotency: skip if we've already processed this event id before
      // (Stripe may deliver the same event more than once).
      const { error: dupeError } = await supabase
        .from('processed_webhook_events')
        .insert({ id: event.id, provider: 'stripe' });

      if (dupeError) {
        // Unique violation = already processed this exact event, safe to skip.
        if (dupeError.code === '23505') {
          return res.status(200).json({ received: true, duplicate: true });
        }
        console.error('[stripe-webhook] Dedup insert error:', dupeError);
      }

      const paid = session.payment_status === 'paid';

      // Get decline reason from payment intent if available
      let declineReason = null;
      if (!paid && session.payment_intent) {
        try {
          const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
          declineReason = pi.last_payment_error?.decline_code
            || pi.last_payment_error?.code
            || pi.last_payment_error?.message
            || null;
        } catch (e) {
          // ignore, best-effort
        }
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: paid ? 'verified' : 'failed',
          transaction_id: session.payment_intent || session.id,
          gateway_session_id: session.id,
          notes: declineReason ? `Payment failed: ${declineReason}` : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('order_number', orderNumber);

      if (updateError) {
        console.error('[stripe-webhook] Failed to update order:', updateError);
        return res.status(500).send('Failed to update order');
      }
    }

    // ── Embedded checkout flow (Stripe Elements + confirmCardPayment) ──
    // No Checkout Session involved here — the order number lives in the
    // PaymentIntent's metadata instead (set in create-payment-intent.js).
    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      const orderNumber = paymentIntent.metadata?.orderNumber;

      if (!orderNumber) {
        console.error('[stripe-webhook] No orderNumber on payment intent', paymentIntent.id);
        return res.status(200).json({ received: true });
      }

      const { error: dupeError } = await supabase
        .from('processed_webhook_events')
        .insert({ id: event.id, provider: 'stripe' });

      if (dupeError) {
        if (dupeError.code === '23505') {
          return res.status(200).json({ received: true, duplicate: true });
        }
        console.error('[stripe-webhook] Dedup insert error:', dupeError);
      }

      const paid = event.type === 'payment_intent.succeeded';
      const declineReason = !paid
        ? paymentIntent.last_payment_error?.decline_code
        || paymentIntent.last_payment_error?.code
        || paymentIntent.last_payment_error?.message
        || null
        : null;

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: paid ? 'verified' : 'failed',
          transaction_id: paymentIntent.id,
          gateway_session_id: paymentIntent.id,
          notes: declineReason ? `Payment failed: ${declineReason}` : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('order_number', orderNumber);

      if (updateError) {
        console.error('[stripe-webhook] Failed to update order:', updateError);
        return res.status(500).send('Failed to update order');
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] Handler error:', err);
    return res.status(500).send('Webhook handler error');
  }
}