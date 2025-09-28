import Stripe from 'stripe';

function cors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  const origin = process.env.CORS_ALLOW_ORIGIN || '*';
  cors(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const vs = req.query?.vs;
  if (!vs) return res.status(400).json({ error: 'Missing vs' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY env var' });
  }
  if (!process.env.CHECKOUT_SUCCESS_URL || !process.env.CHECKOUT_CANCEL_URL) {
    return res.status(500).json({ error: 'Missing CHECKOUT_* env vars' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.identity.verificationSessions.retrieve(vs);

    // still waiting on doc/selfie processing:
    if (session.status === 'processing' || session.status === 'requires_input') {
      return res.status(202).json({ status: session.status });
    }

    if (session.status !== 'verified') {
      return res.status(403).json({ status: session.status, error: 'Not verified' });
    }

    const { email, priceId } = session.metadata || {};
    if (!priceId) return res.status(400).json({ error: 'Missing priceId in metadata' });

    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      success_url: process.env.CHECKOUT_SUCCESS_URL,
      cancel_url: process.env.CHECKOUT_CANCEL_URL
    });

    return res.status(200).json({ url: checkout.url });
  } catch (e) {
    console.error('continue-to-checkout error:', e);
    return res.status(500).json({ error: 'Stripe error continuing to checkout' });
  }
}
