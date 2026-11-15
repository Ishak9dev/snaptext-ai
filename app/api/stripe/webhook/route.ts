
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

    // Check whether this event has already been processed.
    const { data: existingEvent, error: lookupError } =
      await supabaseAdmin
        .from("stripe_webhook_events")
        .select("id")
        .eq("id", event.id)
        .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (existingEvent) {
      return NextResponse.json({
        received: true,
        duplicate: true,
      });
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

    // Record the event only after the subscription update succeeds.
    const { error: eventError } = await supabaseAdmin
      .from("stripe_webhook_events")
      .insert({
        id: event.id,
        event_type: event.type,
      });

    if (eventError) {
      throw eventError;
    }

    console.log("Stripe subscription synchronized:", subscription.id);

    return NextResponse.json({
      received: true,
      subscriptionUpdated: true,
    });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
