
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";


export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");

    return NextResponse.json(
      { error: "Webhook is not configured." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Stripe signature verification failed:", error);

    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  try {
    const handledEvents = [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ];

    if (!handledEvents.includes(event.type)) {
      return NextResponse.json({ received: true });
    }

    // Claim the event atomically. The unique event ID makes concurrent deliveries idempotent.
    const { error: claimError } = await supabaseAdmin
      .from("stripe_webhook_events")
      .insert({ id: event.id, event_type: event.type });
    if (claimError) {
      if (claimError.code === "23505") {
        return NextResponse.json({ received: true, duplicate: true });
      }
      throw claimError;
    }

    let subscriptionId: string | null = null;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscription = session.subscription;

      subscriptionId =
        typeof subscription === "string"
          ? subscription
          : subscription?.id ?? null;
    } else {
      const subscription = event.data.object as Stripe.Subscription;
      subscriptionId = subscription.id;
    }

    if (!subscriptionId) {
      throw new Error("Stripe event does not contain a subscription ID.");
    }

    // Retrieve the latest subscription state from Stripe.
    const subscription =
      await stripe.subscriptions.retrieve(subscriptionId);

    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;

    // Find the matching SnapText AI user.
    let userId = subscription.metadata.supabaseUserId;

    if (!userId) {
      const { data: existingSubscription, error: userLookupError } =
        await supabaseAdmin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

      if (userLookupError) {
        throw userLookupError;
      }

      userId = existingSubscription?.user_id;
    }

    if (!userId) {
      throw new Error(
        "Could not identify the Supabase user for this subscription."
      );
    }

    const firstItem = subscription.items.data[0];

    const currentPeriodEnd = firstItem?.current_period_end
      ? new Date(firstItem.current_period_end * 1000).toISOString()
      : null;

    // Save or update the user's subscription.
    const { error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          price_id: firstItem?.price.id ?? null,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (subscriptionError) {
      throw subscriptionError;
    }

    console.log("Stripe subscription synchronized:", subscription.id);

    return NextResponse.json({
      received: true,
      subscriptionUpdated: true,
    });
  } catch (error) {
    // Release the claim on failure so Stripe's retry can process the event again.
    await supabaseAdmin.from("stripe_webhook_events").delete().eq("id", event.id);
    console.error("Stripe webhook processing error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
