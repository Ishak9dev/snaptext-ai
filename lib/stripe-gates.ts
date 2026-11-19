import "server-only";

export type StripeMode = "test" | "live";

export function getStripeMode(): StripeMode | null {
  const secretKey = process.env.STRIPE_SECRET_KEY ?? "";
  if (/^(?:sk|rk)_live_/.test(secretKey)) return "live";
  if (/^(?:sk|rk)_test_/.test(secretKey)) return "test";
  return null;
}

export function isStripeModeAllowedForEnvironment(mode: StripeMode | null) {
  if (!mode) return false;

  if (process.env.VERCEL_ENV === "production") {
    return mode === "live" && process.env.NODE_ENV === "production";
  }

  if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development") {
    return mode === "test";
  }

  // Local development uses Test Mode. Live payments are only accepted on the
  // canonical Vercel Production deployment.
  return process.env.NODE_ENV === "development" && mode === "test";
}

function publishableKeyMatchesMode(mode: StripeMode) {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  return mode === "live"
    ? publishableKey.startsWith("pk_live_")
    : publishableKey.startsWith("pk_test_");
}

/**
 * Checkout uses exactly the configured Stripe key. Live mode is available only
 * to production deployments; production deployments reject Test keys instead
 * of silently falling back to Test Mode.
 */
export function isPaidCheckoutEnabled() {
  const mode = getStripeMode();
  if (!isStripeModeAllowedForEnvironment(mode) || !publishableKeyMatchesMode(mode!)) return false;
  if (!process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) return false;
  return /^price_[A-Za-z0-9]+$/.test(process.env.STRIPE_PRO_PRICE_ID ?? "");
}
