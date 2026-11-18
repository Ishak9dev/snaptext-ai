import { createClient } from "@/lib/supabase/client";

type SaveToolHistoryClientParams = {
  toolType: string;
  fileName: string;
  result: unknown;
  metadata?: Record<string, unknown>;
};

/** Save a completed tool result to the authenticated user's shared history. */
export async function saveToolHistoryClient({
  toolType,
  fileName,
  result,
  metadata = {},
}: SaveToolHistoryClientParams): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("Your session has expired. Please sign in again.");

  const serializedResult = JSON.stringify(result ?? null);
  const resultText =
    typeof result === "string" ? result : serializedResult ?? String(result);

  const { error } = await supabase.from("tool_history").insert({
    user_id: user.id,
    tool_type: toolType,
    file_name: fileName,
    result_text: resultText,
    metadata,
  });

  if (error) throw error;
}
