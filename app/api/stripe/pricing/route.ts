import { connection, NextResponse } from "next/server";
import { getStripePlanPrice } from "@/lib/stripe-plans";
import { isPaidCheckoutEnabled } from "@/lib/stripe-gates";

export async function GET() {
  // Stripe configuration and Price data are deployment-specific runtime data.
  // Keep this endpoint out of the build-time prerendered output.
  await connection();
  const paidCheckoutEnabled = isPaidCheckoutEnabled();
  // Prices can still be shown when a browser key or webhook secret is missing.
  // Checkout remains fail-closed until the complete matching configuration is
  // present, while the pricing page never hides valid Stripe prices.
  const [monthlyResult, yearlyResult] = await Promise.allSettled([
    getStripePlanPrice("monthly"),
    getStripePlanPrice("yearly"),
  ]);

  const monthly = monthlyResult.status === "fulfilled"
    ? { id: monthlyResult.value.id, amountCents: monthlyResult.value.unit_amount!, currency: monthlyResult.value.currency, interval: "month" as const }
    : null;
  const yearly = yearlyResult.status === "fulfilled"
    ? { id: yearlyResult.value.id, amountCents: yearlyResult.value.unit_amount!, currency: yearlyResult.value.currency, interval: "year" as const }
    : null;
  const annualizedMonthlyCents = monthly ? monthly.amountCents * 12 : null;
  const savingsCents = annualizedMonthlyCents !== null && yearly
    ? annualizedMonthlyCents - yearly.amountCents
    : null;

  return NextResponse.json(
    {
      paidCheckoutEnabled,
      yearlyConfigured: Boolean(process.env.STRIPE_YEARLY_PRICE_ID),
      monthly,
      yearly,
      savingsCents: savingsCents !== null && savingsCents > 0 ? savingsCents : null,
      savingsPercent: savingsCents !== null && savingsCents > 0 && annualizedMonthlyCents
        ? Math.round((savingsCents / annualizedMonthlyCents) * 1000) / 10
        : null,
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}
