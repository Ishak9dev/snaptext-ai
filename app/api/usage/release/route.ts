import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAuthenticatedUser, releaseToolUsage } from "@/lib/usage";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: { reservationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.reservationId !== "string" || body.reservationId.length === 0) {
    return NextResponse.json({ error: "Invalid reservation." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("tool_usage_events")
    .select("id")
    .eq("id", body.reservationId)
    .eq("user_id", user.id)
    .eq("status", "reserved")
    .maybeSingle();

  if (error) {
    console.error("Unable to verify usage reservation for release", error);
    return NextResponse.json(
      { error: "Unable to verify usage reservation." },
      { status: 503 }
    );
  }

  // Treat an already completed/released or unknown reservation as an idempotent no-op.
  if (!data) return NextResponse.json({ success: true });

  try {
    await releaseToolUsage(body.reservationId);
    return NextResponse.json({ success: true });
  } catch (releaseError) {
    console.error("Usage release endpoint failed", releaseError);
    return NextResponse.json(
      { error: "Unable to release tool usage. Please try again." },
      { status: 503 }
    );
  }
}
