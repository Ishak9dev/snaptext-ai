import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { APP_URL } from "@/lib/seo";
import { isPaidCheckoutEnabled } from "@/lib/stripe-gates";
import {
  getStripePlanPrice,
  StripePlanConfigurationError,
  type SubscriptionPlan,
} from "@/lib/stripe-plans";

export async function POST(request: Request) {
  let plan: SubscriptionPlan = "monthly";
  let locale: "en" | "fr" = "en";
  try {
    if (!request.headers.get("origin") || request.headers.get("origin") !== new URL(request.url).origin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    }

    if (!isPaidCheckoutEnabled()) {
      return NextResponse.json(
        { error: "Stripe checkout is not configured for this deployment.", code: "STRIPE_CONFIGURATION_INVALID" },
        { status: 503 }
      );
    }

    // No body continues to mean the existing monthly plan for older callers.
    const rawBody = await request.text();
    if (rawBody) {
      let body: unknown;
      try {
        body = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
      }
      if (
        !body
        || typeof body !== "object"
        || !("plan" in body)
        || (body.plan !== "monthly" && body.plan !== "yearly")
      ) {
        return NextResponse.json({ error: "Unknown subscription plan." }, { status: 400 });
      }
      plan = body.plan;
      if ("locale" in body && body.locale !== "en" && body.locale !== "fr") {
        return NextResponse.json({ error: "Unknown locale." }, { status: 400 });
      }
      if ("locale" in body) locale = body.locale as "en" | "fr";
    }

    const { data: existingSubscription, error: customerLookupError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status, price_id, current_period_end, cancel_at_period_end, created_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (customerLookupError) throw customerLookupError;

    const terminalStatuses = new Set(["canceled", "incomplete_expired"]);
    if (
      existingSubscription?.stripe_subscription_id
      && !terminalStatuses.has(existingSubscription.status ?? "")
    ) {
      return NextResponse.json(
        { error: "You already have a subscription. Manage it before starting another plan.", code: "SUBSCRIPTION_EXISTS" },
        { status: 409 }
      );
    }

    const price = await getStripePlanPrice(plan);
    const stripe = getStripeClient();
    const admin = getSupabaseAdmin();
    let customerId = existingSubscription?.stripe_customer_id ?? null;

    // Catch unfinished sessions created by the older customer_email flow
    // before making a new Customer for this account.
    const openSessions = customerId
      ? await stripe.checkout.sessions.list({ customer: customerId, status: "open", limit: 100 })
      : await stripe.checkout.sessions.list({ status: "open", limit: 100 });
    const pendingSession = openSessions.data.find(
      (session) => session.client_reference_id === user.id
    );
    if (pendingSession) {
      if (pendingSession.metadata?.planType === plan && pendingSession.url) {
        return NextResponse.json({ url: pendingSession.url });
      }
      return NextResponse.json(
        { error: "A checkout is already in progress. Finish or cancel it before selecting another plan.", code: "CHECKOUT_IN_PROGRESS" },
        { status: 409 }
      );
    }

    // Create one Stripe Customer per authenticated Supabase user. The stable
    // idempotency key makes parallel requests reuse the same customer.
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabaseUserId: user.id },
      }, { idempotencyKey: `snaptext-ai-customer-${user.id}` });
      customerId = customer.id;

      const now = new Date().toISOString();
      const { error: saveCustomerError } = await admin.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: existingSubscription?.stripe_subscription_id ?? null,
        status: existingSubscription?.status ?? "incomplete",
        price_id: existingSubscription?.price_id ?? null,
        current_period_end: existingSubscription?.current_period_end ?? null,
        cancel_at_period_end: existingSubscription?.cancel_at_period_end ?? false,
        created_at: existingSubscription?.created_at ?? now,
        updated_at: now,
      }, { onConflict: "user_id" });
      if (saveCustomerError) throw saveCustomerError;
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        client_reference_id: user.id,
        metadata: { supabaseUserId: user.id, planType: plan },
        line_items: [{ price: price.id, quantity: 1 }],
        subscription_data: {
          metadata: { supabaseUserId: user.id, planType: plan },
        },
        success_url: `${APP_URL}/${locale === "fr" ? "fr/" : ""}dashboard?checkout=success`,
        cancel_url: `${APP_URL}/${locale === "fr" ? "fr/" : ""}dashboard?checkout=cancelled`,
      },
      // One key per user/subscription generation serializes simultaneous
      // monthly/yearly requests and makes retries reuse the same session.
      {
        idempotencyKey: `snaptext-ai-checkout-${user.id}-${existingSubscription?.stripe_subscription_id ?? "initial"}`,
      }
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof StripePlanConfigurationError) {
      const missingPrice = error.code === "PRICE_NOT_CONFIGURED";
      return NextResponse.json(
        {
          error: missingPrice && plan === "yearly"
              ? "The selected subscription price is not configured for this Stripe mode. Set STRIPE_YEARLY_PRICE_ID to a matching recurring Price ID."
            : missingPrice
              ? "The monthly subscription price is not configured."
              : "The selected subscription price is invalid or inactive.",
          code: error.code,
        },
        { status: 503 }
      );
    }

    const stripeError = error && typeof error === "object" ? error as { code?: unknown; type?: unknown } : null;
    if ([stripeError?.code, stripeError?.type].some((value) => value === "idempotency_error" || value === "StripeIdempotencyError" || value === "idempotency_key_in_use")) {
      return NextResponse.json(
        { error: "A checkout is already in progress. Finish or cancel it before selecting another plan.", code: "CHECKOUT_IN_PROGRESS" },
        { status: 409 }
      );
    }

    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Unable to start checkout." },
      { status: 500 }
    );
  }
}
