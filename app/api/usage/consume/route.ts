import { NextResponse } from "next/server";
import { getAuthenticatedUser, reserveToolUsage, type ToolId, TOOL_IDS } from "@/lib/usage";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: { toolId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (typeof body.toolId !== "string" || !TOOL_IDS.includes(body.toolId as ToolId)) {
    return NextResponse.json({ error: "Unknown tool." }, { status: 400 });
  }
  try {
    const quota = await reserveToolUsage(user.id, body.toolId as ToolId);
    if (!quota.allowed) return NextResponse.json({
      error: "You've used your two free lifetime uses for this tool. Upgrade to Pro for unlimited access.",
      code: "TOOL_QUOTA_EXHAUSTED", used: quota.used, limit: 2,
    }, { status: 403 });
    return NextResponse.json({ success: true, isPro: quota.isPro, used: quota.used, limit: quota.isPro ? null : 2, reservationId: quota.reservationId });
  } catch {
    return NextResponse.json({ error: "Unable to verify usage. Please try again." }, { status: 503 });
  }
}
