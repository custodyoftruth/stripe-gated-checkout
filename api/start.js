import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const { priceId, email } = req.query || {};
  if (!priceId) return res.status(400).send('Missing priceId');

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const vs = await stripe.identity.verificationSessions.create({
    type: 'document',                 // add "selfie" later if you want
    metadata: { priceId, email: email || '' },
    options: {
      // Send them back to OUR server (no JS needed on Squarespace)
      return_url: `${process.env.SERVER_RETURN_URL}?vs={VERIFICATION_SESSION_ID}` 
    }
  });

  // 302 redirect to Stripe's hosted Identity flow
  res.writeHead(302, { Location: vs.url });
  res.end();
}
