import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/** Create Stripe only when a request needs it, so builds do not require secrets. */
export function getStripeClient() {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Missing STRIPE_SECRET_KEY");

  stripeClient = new Stripe(secretKey);
  return stripeClient;
}
