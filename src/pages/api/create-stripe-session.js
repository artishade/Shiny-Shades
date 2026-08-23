// ===================================================
// POST /api/create-stripe-session
//
// Creates a Stripe Checkout session for an order that has
// already been saved to Supabase with payment_status = 'pending'.
//
// Runs server-side only (Vercel serverless function) — this is the
// ONLY place your Stripe secret key is ever used.
//
// Required environment variables (set in Vercel Project Settings
// > Environment Variables, NOT in your .env that ships to the browser):
//   STRIPE_SECRET_KEY        e.g. sk_test_...
//   PUBLIC_SITE_URL          e.g. https://...........
// ===================================================

import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { STRIPE_SECRET_KEY, PUBLIC_SITE_URL } = process.env;

  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe is not configured on the server.' });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);

  try {
    const { orderNumber, amount, currency = 'usd', customerEmail, items } = req.body || {};

    // ── Basic input validation ────────────────────────────────────────
    if (!orderNumber || typeof orderNumber !== 'string') {
      return res.status(400).json({ error: 'orderNumber is required.' });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'A valid positive amount is required.' });
    }

    const siteUrl = (PUBLIC_SITE_URL || `https://${req.headers.host}`).replace(/\/$/, '');

    // Stripe wants amounts in the smallest currency unit (e.g. cents for USD).
    // We never trust a price sent from the client beyond this point without
    // also re-validating against your own order record server-side in
    // production — see the note in stripe-webhook.js.
    const unitAmount = Math.round(amount * 100);

    // Build readable line items if provided, otherwise fall back to one
    // single line item for the whole order total.
    const lineItems =
      Array.isArray(items) && items.length > 0
        ? items.map((item) => ({
          price_data: {
            currency,
            product_data: { name: String(item.name || 'Item').slice(0, 250) },
            unit_amount: Math.round(Number(item.price || 0) * 100),
          },
          quantity: Math.max(1, Number(item.quantity || 1)),
        }))
        : [
          {
            price_data: {
              currency,
              product_data: { name: `Order ${orderNumber}` },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: customerEmail || undefined,
      // orderNumber travels with the session so the webhook can find the
      // matching Supabase row when payment completes.
      client_reference_id: orderNumber,
      metadata: { orderNumber },
      success_url: `${siteUrl}/payment/success?order=${encodeURIComponent(orderNumber)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/payment/cancel?order=${encodeURIComponent(orderNumber)}&reason=cancelled`,
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[create-stripe-session]', err);
    return res.status(500).json({ error: 'Failed to create Stripe session.' });
  }
}
