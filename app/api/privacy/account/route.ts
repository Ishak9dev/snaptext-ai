import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";
import { listUserStorageObjects, removeUserStorageObjects } from "@/lib/user-storage";

export async function DELETE(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;

    if (subscription?.stripe_customer_id) {
      const stripe = getStripeClient();
      const openSessions = await stripe.checkout.sessions.list({
        customer: subscription.stripe_customer_id,
        status: "open",
        limit: 100,
      });
      for (const session of openSessions.data) {
        if (session.client_reference_id === user.id) {
          await stripe.checkout.sessions.expire(session.id);
        }
      }
    }

    if (subscription?.stripe_subscription_id) {
      const stripe = getStripeClient();
      const current = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
      if (!new Set(["canceled", "incomplete_expired"]).has(current.status)) {
        // Account deletion explicitly stops billing now. Stripe keeps its
        // invoice and payment records for the applicable retention period.
        await stripe.subscriptions.cancel(current.id);
      }
    }

    // Gather everything before mutating so scan failures do not partially erase
    // the account. A retry is safe if any later cleanup operation fails.
    const files = await listUserStorageObjects(user.id);
    await removeUserStorageObjects(files);

    const cleanupQueries = [
      supabaseAdmin.from("tool_history").delete().eq("user_id", user.id),
      supabaseAdmin.from("extractions").delete().eq("user_id", user.id),
      supabaseAdmin.from("tool_usage_events").delete().eq("user_id", user.id),
      supabaseAdmin.from("tool_usage").delete().eq("user_id", user.id),
      supabaseAdmin.from("ai_ocr_rate_limits").delete().eq("user_id", user.id),
      supabaseAdmin.from("document_analysis_rate_limits").delete().eq("user_id", user.id),
      supabaseAdmin.from("form_extractor_rate_limits").delete().eq("user_id", user.id),
      supabaseAdmin.from("receipt_scanner_rate_limits").delete().eq("user_id", user.id),
      supabaseAdmin.from("subscriptions").delete().eq("user_id", user.id),
    ];
    const results = await Promise.all(cleanupQueries);
    const failed = results.find((result) => result.error)?.error;
    if (failed) throw failed;

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteUserError) throw deleteUserError;

    console.info("User account deletion completed", { storedFilesRemoved: files.length });
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "account_deletion_failed";
    console.error("Account deletion failed", { code });
    return NextResponse.json({ error: "Account deletion could not be completed. Please retry or contact support." }, { status: 503 });
  }
}
