import "server-only";

import { getStripeClient } from "@/lib/stripe";
import { getStripeMode, isStripeModeAllowedForEnvironment } from "@/lib/stripe-gates";

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

  const stripeMode = getStripeMode();
  if (!isStripeModeAllowedForEnvironment(stripeMode)) {
    throw new StripePlanConfigurationError("PRICE_INVALID");
  }

  let price;
  try {
    price = await getStripeClient().prices.retrieve(priceId);
  } catch {
    throw new StripePlanConfigurationError("PRICE_INVALID");
  }

  const expectedInterval = plan === "yearly" ? "year" : "month";
  const valid = price.active
    && price.type === "recurring"
    && price.currency === "eur"
    && price.recurring?.interval === expectedInterval
    && price.recurring.interval_count === 1
    && typeof price.unit_amount === "number"
    && price.unit_amount > 0
    && stripeMode !== null
    && price.livemode === (stripeMode === "live")
    && (plan !== "yearly" || price.unit_amount === 2999)
    && isStripeModeAllowedForEnvironment(stripeMode);

  if (!valid) {
    throw new StripePlanConfigurationError("PRICE_INVALID");
  }

  return price;
}
