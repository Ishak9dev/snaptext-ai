
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";
import { APP_URL } from "@/lib/seo";

export async function POST(request: Request) {
  try {
    if (!request.headers.get("origin") || request.headers.get("origin") !== new URL(request.url).origin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    // Verify the authenticated user.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    // Retrieve the user's Stripe customer ID.
    const { data: subscription, error } = await getSupabaseAdmin()
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (!subscription?.stripe_customer_id || !subscription.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No Stripe customer found for this account." },
        { status: 404 }
      );
    }

    // Create the Stripe Customer Portal session.
    const session = await getStripeClient().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${APP_URL}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal error:", error);

    return NextResponse.json(
      { error: "Unable to open the billing portal." },
      { status: 500 }
    );
  }
}
