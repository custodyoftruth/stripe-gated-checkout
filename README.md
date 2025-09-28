# Stripe-Gated Checkout (Identity -> Checkout)
Two endpoints:
- POST `/api/create-verification`   -> returns Stripe Identity URL
- GET  `/api/continue-to-checkout?vs=...`  -> returns Stripe Checkout URL after verified

Env vars (Vercel Project Settings → Environment Variables):
- STRIPE_SECRET_KEY=sk_test_... or sk_live_...
- RETURN_URL_BASE=https://<your-squarespace-page-url>
- CHECKOUT_SUCCESS_URL=https://<yourdomain>/thanks
- CHECKOUT_CANCEL_URL=https://<yourdomain>/canceled
- CORS_ALLOW_ORIGIN=https://<your-squarespace-domain> (or *)
