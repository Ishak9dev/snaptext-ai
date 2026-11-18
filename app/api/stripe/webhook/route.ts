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

  let ownedClaimAt: string | null = null;
  try {
    const { data: processedEvent, error: processedLookupError } = await supabaseAdmin
      .from("stripe_webhook_events")
      .select("id, processed_at")
      .eq("id", event.id)
      .maybeSingle();
    if (processedLookupError) throw processedLookupError;

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
    if (!subscriptionId) {
      // Invoice events can be for one-time purchases. They don't affect a subscription.
      if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
        if (processedEvent) return NextResponse.json({ received: true, duplicate: true });
        const { error } = await supabaseAdmin.from("stripe_webhook_events").insert({ id: event.id, event_type: event.type, processed_at: new Date().toISOString() });
        if (error?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
        if (error) throw error;
        return NextResponse.json({ received: true, ignored: true });
      }
      throw new Error("subscription_missing");
    }

    // Always sync the latest Stripe state; event delivery order can differ from update order.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const metadataUserId = subscription.metadata.supabaseUserId || null;
    const [customerMapping, subscriptionMapping] = await Promise.all([
      supabaseAdmin.from("subscriptions").select("user_id, stripe_subscription_id").eq("stripe_customer_id", customerId).maybeSingle(),
      supabaseAdmin.from("subscriptions").select("user_id, stripe_customer_id").eq("stripe_subscription_id", subscription.id).maybeSingle(),
    ]);
    if (customerMapping.error) throw customerMapping.error;
    if (subscriptionMapping.error) throw subscriptionMapping.error;
    if (customerMapping.data && subscriptionMapping.data && customerMapping.data.user_id !== subscriptionMapping.data.user_id) {
      throw new Error("subscription_mapping_conflict");
    }
    const userId = metadataUserId ?? customerMapping.data?.user_id ?? subscriptionMapping.data?.user_id;
    if (!userId) throw new Error("subscription_user_mapping_missing");
    if ((customerMapping.data && customerMapping.data.user_id !== userId) || (subscriptionMapping.data && subscriptionMapping.data.user_id !== userId)) {
      throw new Error("subscription_mapping_conflict");
    }

    const { data: userSubscription, error: userSubscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status, current_period_end, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (userSubscriptionError) throw userSubscriptionError;
    if (processedEvent && userSubscription?.stripe_subscription_id === subscription.id) {
      const recordedAt = new Date(processedEvent.processed_at).getTime();
      const subscriptionSyncedAt = new Date(userSubscription.updated_at).getTime();
      // A successful prior delivery writes the subscription first, then stores
      // the same timestamp in the ledger. Older pre-repair claims whose write
      // failed have a newer ledger time and can be reclaimed for Stripe retry.
      if (Number.isFinite(recordedAt) && Number.isFinite(subscriptionSyncedAt) && subscriptionSyncedAt >= recordedAt) {
        return NextResponse.json({ received: true, duplicate: true });
      }
    }
    const now = Date.now();
    if (processedEvent) {
      const claimAge = now - new Date(processedEvent.processed_at).getTime();
      if (Number.isFinite(claimAge) && claimAge < 30_000) {
        return NextResponse.json({ error: "Webhook event processing is already in progress." }, { status: 503 });
      }
      ownedClaimAt = new Date(now).toISOString();
      let reclaimQuery = supabaseAdmin.from("stripe_webhook_events")
        .update({ event_type: event.type, processed_at: ownedClaimAt })
        .eq("id", event.id);
      reclaimQuery = processedEvent.processed_at === null
        ? reclaimQuery.is("processed_at", null)
        : reclaimQuery.eq("processed_at", processedEvent.processed_at);
      const { data: reclaimed, error: reclaimError } = await reclaimQuery.select("id").maybeSingle();
      if (reclaimError) throw reclaimError;
      if (!reclaimed) return NextResponse.json({ error: "Webhook event is being processed by another request." }, { status: 503 });
    } else {
      ownedClaimAt = new Date(now).toISOString();
      const { error: claimError } = await supabaseAdmin.from("stripe_webhook_events").insert({ id: event.id, event_type: event.type, processed_at: ownedClaimAt });
      if (claimError?.code === "23505") return NextResponse.json({ error: "Webhook event is being processed by another request." }, { status: 503 });
      if (claimError) throw claimError;
    }
    if (userSubscription && (userSubscription.stripe_customer_id !== customerId || userSubscription.stripe_subscription_id !== subscription.id)) {
      const priorPeriodEnded = !userSubscription.current_period_end || new Date(userSubscription.current_period_end).getTime() <= Date.now();
      const priorSubscriptionIsTerminal = ["canceled", "incomplete_expired", "unpaid"].includes(userSubscription.status ?? "");
      if (!priorPeriodEnded || !priorSubscriptionIsTerminal) throw new Error("user_has_another_subscription");
    }

    const item = subscription.items.data[0];
    const syncedAt = new Date().toISOString();
    const { error: saveError } = await supabaseAdmin.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      price_id: item?.price.id ?? null,
      current_period_end: asIso(item?.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: syncedAt,
    }, { onConflict: "user_id" });
    if (saveError) throw saveError;

    // Advance the claim's processed_at only after the subscription upsert. This
    // keeps the existing ledger schema sufficient to detect completion/retry.
    const { data: eventSaved, error: eventSaveError } = await supabaseAdmin.from("stripe_webhook_events")
      .update({ event_type: event.type, processed_at: syncedAt })
      .eq("id", event.id)
      .eq("processed_at", ownedClaimAt)
      .select("id")
      .maybeSingle();
    if (eventSaveError) throw eventSaveError;
    if (!eventSaved) throw new Error("webhook_claim_lost");
    return NextResponse.json({ received: true, subscriptionUpdated: true });
  } catch (error) {
    // Release only this request's unfinished claim so Stripe's retry can proceed.
    if (ownedClaimAt) {
      await supabaseAdmin.from("stripe_webhook_events").delete().eq("id", event.id).eq("processed_at", ownedClaimAt);
    }
    const code = error instanceof Error && "code" in error ? String(error.code) : "processing_error";
    console.error("Stripe webhook processing failed", { eventId: event.id, type: event.type, code });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
