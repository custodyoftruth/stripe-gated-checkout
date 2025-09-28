import Stripe from 'stripe';

function cors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  const origin = process.env.CORS_ALLOW_ORIGIN || '*';
  cors(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { email, priceId } = req.body || {};

  if (!priceId) {
    return res.status(400).json({ error: 'Missing priceId' });
  }
  if (!process.env.RETURN_URL_BASE) {
    return res.status(500).json({ error: 'Missing RETURN_URL_BASE env var' });
  }

  try {
    const vs = await stripe.identity.verificationSessions.create({
      type: 'document',                 // add selfie/id_number later if needed
      metadata: { email, priceId },     // keep data for the next step
      options: {
        return_url: `${process.env.RETURN_URL_BASE}?vs={VERIFICATION_SESSION_ID}` 
      }
    });
    return res.status(200).json({ url: vs.url });
  } catch (e) {
    console.error('create-verification error:', e);
    return res.status(500).json({ error: 'Stripe error creating verification session' });
  }
}
