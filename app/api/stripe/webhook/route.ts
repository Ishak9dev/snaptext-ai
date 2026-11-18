import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

const HANDLED_EVENTS = new Set([
  "checkout.session.completed", "customer.subscription.created",
  "customer.subscription.updated", "customer.subscription.deleted",
  "invoice.paid", "invoice.payment_failed",
]);

function asIso(timestamp: number | null | undefined) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Stripe webhook is not configured");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    console.error("Stripe webhook signature verification failed");
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }
  if (!HANDLED_EVENTS.has(event.type)) return NextResponse.json({ received: true });

  try {
    const { error: claimError } = await supabaseAdmin.from("stripe_webhook_events").insert({ id: event.id, event_type: event.type });
    if (claimError?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    if (claimError) throw claimError;

    let subscriptionId: string | null = null;
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
    } else if (event.type.startsWith("customer.subscription.")) {
      subscriptionId = (event.data.object as Stripe.Subscription).id;
    } else {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
      const linked = invoice.subscription;
      subscriptionId = typeof linked === "string" ? linked : linked?.id ?? null;
      if (!subscriptionId) {
        const parent = invoice.parent as (Stripe.Invoice.Parent & { subscription_details?: { subscription?: string | Stripe.Subscription | null } }) | null;
        const nested = parent?.subscription_details?.subscription;
        subscriptionId = typeof nested === "string" ? nested : nested?.id ?? null;
      }
    }
    if (!subscriptionId) throw new Error("subscription_missing");

    // Always sync the latest Stripe state; event delivery order can differ from update order.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    let userId = subscription.metadata.supabaseUserId;
    if (!userId) {
      const { data, error } = await supabaseAdmin.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
      if (error) throw error;
      userId = data?.user_id;
    }
    if (!userId) throw new Error("subscription_user_mapping_missing");

    const item = subscription.items.data[0];
    const { error: saveError } = await supabaseAdmin.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      price_id: item?.price.id ?? null,
      billing_interval: item?.price.recurring?.interval ?? null,
      current_period_start: asIso(item?.current_period_start),
      current_period_end: asIso(item?.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: asIso(subscription.canceled_at),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (saveError) throw saveError;
    return NextResponse.json({ received: true, subscriptionUpdated: true });
  } catch (error) {
    // Release only failed claims so Stripe can retry. Never log payloads or secrets.
    await supabaseAdmin.from("stripe_webhook_events").delete().eq("id", event.id);
    const code = error instanceof Error && "code" in error ? String(error.code) : "processing_error";
    console.error("Stripe webhook processing failed", { eventId: event.id, type: event.type, code });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
