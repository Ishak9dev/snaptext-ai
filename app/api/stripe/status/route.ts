import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const [{ data: subscription, error }, { data: usage, error: usageError }] = await Promise.all([
    supabaseAdmin.from("subscriptions").select("status, price_id, current_period_end, cancel_at_period_end, updated_at").eq("user_id", user.id).maybeSingle(),
    supabase.rpc("get_my_tool_usage"),
  ]);
  if (error || usageError) {
    console.error("Could not load subscription dashboard state", error?.code, usageError?.code);
    return NextResponse.json({ error: "Unable to load subscription status." }, { status: 503 });
  }
  const rows = usage ?? [];
  return NextResponse.json({
    status: subscription?.status ?? "free",
    priceId: subscription?.price_id ?? null,
    currentPeriodStart: null,
    currentPeriodEnd: subscription?.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    canceledAt: null,
    isPremium: rows.some((row: { is_pro?: boolean }) => Boolean(row.is_pro)),
    totalUsed: rows.reduce((total: number, row: { used_count?: number }) => total + Number(row.used_count ?? 0), 0),
    totalLimit: rows.length * 2,
  }, { headers: { "Cache-Control": "private, no-store" } });
}
