import "server-only";

import { stripe } from "@/lib/stripe";

export type SubscriptionPlan = "monthly" | "yearly";

export class StripePlanConfigurationError extends Error {
  constructor(readonly code: "PRICE_NOT_CONFIGURED" | "PRICE_INVALID") {
    super(code);
    this.name = "StripePlanConfigurationError";
  }
}

export async function getStripePlanPrice(plan: SubscriptionPlan) {
  const priceId = plan === "monthly"
    ? process.env.STRIPE_PRO_PRICE_ID
    : process.env.STRIPE_YEARLY_PRICE_ID;

  if (!priceId) {
    throw new StripePlanConfigurationError("PRICE_NOT_CONFIGURED");
  }

  let price;
  try {
    price = await stripe.prices.retrieve(priceId);
  } catch {
    throw new StripePlanConfigurationError("PRICE_INVALID");
  }

  const keyIsLive = /^(?:sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "");
  const expectedInterval = plan === "yearly" ? "year" : "month";
  const valid = price.active
    && price.type === "recurring"
    && price.currency === "eur"
    && price.recurring?.interval === expectedInterval
    && typeof price.unit_amount === "number"
    && price.livemode === keyIsLive
    && (plan !== "yearly" || price.unit_amount === 2999)
    && (process.env.NODE_ENV === "production" || !price.livemode);

  if (!valid) {
    throw new StripePlanConfigurationError("PRICE_INVALID");
  }

  return price;
}
