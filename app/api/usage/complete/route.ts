import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { completeToolUsage, getAuthenticatedUser } from "@/lib/usage";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: { reservationId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body.reservationId !== "string") return NextResponse.json({ error: "Invalid reservation." }, { status: 400 });
  const { data, error } = await supabaseAdmin.from("tool_usage_events")
    .select("id").eq("id", body.reservationId).eq("user_id", user.id).eq("status", "reserved").maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to verify usage reservation." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Usage reservation not found." }, { status: 404 });
  try {
    await completeToolUsage(body.reservationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Usage completion endpoint failed", error);
    return NextResponse.json(
      { error: "Unable to finalize tool usage. Please try again." },
      { status: 503 }
    );
  }
}
