import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { APP_URL } from "@/lib/seo";
import {
  getStripePlanPrice,
  StripePlanConfigurationError,
  type SubscriptionPlan,
} from "@/lib/stripe-plans";

export async function POST(request: Request) {
  let plan: SubscriptionPlan = "monthly";
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
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
    }

    const { data: existingSubscription, error: customerLookupError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status")
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

    // Reuse an unfinished checkout for this user instead of opening another
    // subscription flow, including requests made from a second browser tab.
    const sessionLookup = existingSubscription?.stripe_customer_id
      ? { customer: existingSubscription.stripe_customer_id }
      : user.email
        ? { customer_details: { email: user.email } }
        : null;
    if (sessionLookup) {
      const openSessions = await stripe.checkout.sessions.list({
        ...sessionLookup,
        status: "open",
        limit: 100,
      });
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
    }

    const price = await getStripePlanPrice(plan);
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        ...(existingSubscription?.stripe_customer_id
          ? { customer: existingSubscription.stripe_customer_id }
          : { customer_email: user.email ?? undefined }),
        client_reference_id: user.id,
        metadata: { supabaseUserId: user.id, planType: plan },
        line_items: [{ price: price.id, quantity: 1 }],
        subscription_data: {
          metadata: { supabaseUserId: user.id, planType: plan },
        },
        success_url: `${APP_URL}/?checkout=success`,
        cancel_url: `${APP_URL}/?checkout=cancelled`,
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
            ? "The selected subscription price is not configured. Add the Stripe Test Price ID to STRIPE_YEARLY_PRICE_ID."
            : missingPrice
              ? "The monthly subscription price is not configured."
              : "The selected subscription price is invalid or inactive.",
          code: error.code,
        },
        { status: 503 }
      );
    }

    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Unable to start checkout." },
      { status: 500 }
    );
  }
}
