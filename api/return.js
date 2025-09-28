import Stripe from 'stripe';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const { vs } = req.query || {};
  if (!vs) return res.status(400).send('Missing vs');

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Poll briefly in case Identity is still "processing"
  let session;
  for (let i = 0; i < 8; i++) {
    session = await stripe.identity.verificationSessions.retrieve(vs);
    if (session.status !== 'processing') break;
    await sleep(1500);
  }

  if (!session || session.status !== 'verified') {
    // Not verified / canceled / timed out → send to your failure page
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

  // 302 redirect to Stripe Checkout
  res.writeHead(302, { Location: checkout.url });
  res.end();
}
