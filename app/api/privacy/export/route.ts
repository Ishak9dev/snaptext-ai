import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });

  const [history, subscription] = await Promise.all([
    supabase.from("tool_history").select("id, tool_type, file_name, output_file_name, result_text, language, storage_path, mime_type, metadata, created_at").order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("status, price_id, current_period_end, cancel_at_period_end, created_at, updated_at").eq("user_id", user.id).maybeSingle(),
  ]);
  if (history.error || subscription.error) {
    console.error("Privacy export query failed", { history: history.error?.code, subscription: subscription.error?.code });
    return NextResponse.json({ error: "Unable to prepare the export. Please contact support." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email ?? null, createdAt: user.created_at, lastSignInAt: user.last_sign_in_at, userMetadata: user.user_metadata },
    toolHistory: history.data ?? [],
    subscription: subscription.data,
    note: "This export includes data readable through this account session. It does not include Stripe-held payment details, provider logs, backups, or data not exposed by the application schema.",
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="snaptext-ai-data-${user.id}.json"`, "Cache-Control": "private, no-store, max-age=0" },
  });
}
