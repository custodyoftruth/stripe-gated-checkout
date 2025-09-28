import Stripe from 'stripe';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

    const { priceId, email } = req.query || {};
    if (!priceId) return res.status(400).send('Missing priceId');
    if (!process.env.STRIPE_SECRET_KEY) return res.status(500).send('Missing STRIPE_SECRET_KEY');
    if (!process.env.SERVER_RETURN_URL) return res.status(500).send('Missing SERVER_RETURN_URL');

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // NOTE: return_url is TOP-LEVEL (not inside options)
    const vs = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { priceId, email: email || '' },
      return_url: `${process.env.SERVER_RETURN_URL}?vs={VERIFICATION_SESSION_ID}` 
    });

    res.writeHead(302, { Location: vs.url });
    res.end();
  } catch (err) {
    console.error('start.js error:', err);
    res.status(500).send('Server error in /api/start');
  }
}
