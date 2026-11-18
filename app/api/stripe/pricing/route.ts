import { NextResponse } from "next/server";
import { getStripePlanPrice } from "@/lib/stripe-plans";

export async function GET() {
  const [monthlyResult, yearlyResult] = await Promise.allSettled([
    getStripePlanPrice("monthly"),
    getStripePlanPrice("yearly"),
  ]);

  const monthly = monthlyResult.status === "fulfilled"
    ? { amountCents: monthlyResult.value.unit_amount!, currency: monthlyResult.value.currency, interval: "month" as const }
    : null;
  const yearly = yearlyResult.status === "fulfilled"
    ? { amountCents: yearlyResult.value.unit_amount!, currency: yearlyResult.value.currency, interval: "year" as const }
    : null;
  const annualizedMonthlyCents = monthly ? monthly.amountCents * 12 : null;
  const savingsCents = annualizedMonthlyCents !== null && yearly
    ? annualizedMonthlyCents - yearly.amountCents
    : null;

  return NextResponse.json(
    {
      yearlyConfigured: Boolean(process.env.STRIPE_YEARLY_PRICE_ID),
      monthly,
      yearly,
      savingsCents: savingsCents !== null && savingsCents > 0 ? savingsCents : null,
      savingsPercent: savingsCents !== null && savingsCents > 0 && annualizedMonthlyCents
        ? Math.round((savingsCents / annualizedMonthlyCents) * 1000) / 10
        : null,
    },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600" } }
  );
}
