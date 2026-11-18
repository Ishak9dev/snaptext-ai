import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const FREE_TOOL_USES = 2;
export const TOOL_IDS = [
  "ocr", "document-analyzer", "form-extractor", "receipt-scanner",
  "image-description", "background-remover", "image-compressor",
  "image-converter", "image-to-pdf", "metadata-remover",
] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export async function reserveToolUsage(userId: string, toolId: ToolId) {
  const { data, error } = await supabaseAdmin.rpc("reserve_tool_usage", {
    p_user_id: userId,
    p_tool_id: toolId,
  });
  if (error) {
    console.error("Usage reservation failed", error);
    throw new Error("USAGE_SERVICE_UNAVAILABLE");
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.allowed) {
    return {
      allowed: false as const,
      isPro: Boolean(result?.is_pro),
      used: Number(result?.used_count ?? 0),
      limit: FREE_TOOL_USES,
      reservationId: null,
    };
  }
  return {
    allowed: true as const,
    isPro: Boolean(result.is_pro),
    used: Number(result.used_count ?? 0),
    limit: FREE_TOOL_USES,
    reservationId: String(result.reservation_id),
  };
}

export async function completeToolUsage(reservationId: string) {
  const { error } = await supabaseAdmin.rpc("complete_tool_usage", {
    p_reservation_id: reservationId,
  });
  if (error) {
    console.error("Could not finalize tool usage", error);
    throw new Error("USAGE_COMPLETION_FAILED");
  }
}

export async function releaseToolUsage(reservationId: string) {
  const { error } = await supabaseAdmin.rpc("release_tool_usage", {
    p_reservation_id: reservationId,
  });
  if (error) {
    console.error("Could not release tool usage", error);
    throw new Error("USAGE_RELEASE_FAILED");
  }
}

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : user;
}
