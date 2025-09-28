import Stripe from 'stripe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

    const { vs } = req.query || {};
    if (!vs) return res.status(400).send('Missing vs');
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).send('Missing STRIPE_SECRET_KEY');

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Poll briefly if Stripe is still processing
    let session;
    for (let i = 0; i < 8; i++) {
      session = await stripe.identity.verificationSessions.retrieve(vs);
      if (session.status !== 'processing') break;
      await sleep(1500);
    }

    if (!session || session.status !== 'verified') {
      res.writeHead(302, { Location: process.env.CHECKOUT_CANCEL_URL || '/' });
      return res.end();
    }

    const { priceId, email } = session.metadata || {};
    if (!priceId) {
      res.writeHead(302, { Location: process.env.CHECKOUT_CANCEL_URL || '/' });
      return res.end();
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      success_url: process.env.CHECKOUT_SUCCESS_URL,
      cancel_url: process.env.CHECKOUT_CANCEL_URL
    });

    res.writeHead(302, { Location: checkout.url });
    res.end();
  } catch (err) {
    console.error('return.js error:', err);
    res.status(500).send('Server error in /api/return');
  }
}
