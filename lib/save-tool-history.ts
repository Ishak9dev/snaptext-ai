
import { createClient } from "@/lib/supabase/server";

type SaveToolHistoryParams = {
  userId: string;
  toolType: string;
  fileName: string;
  result: unknown;
  metadata?: Record<string, unknown>;
};

export async function saveToolHistory({
  userId,
  toolType,
  fileName,
  result,
  metadata = {},
}: SaveToolHistoryParams): Promise<boolean> {
  try {
    const supabase = await createClient();

    const resultText =
      typeof result === "string"
        ? result
        : JSON.stringify(result);

    const { error } = await supabase.from("tool_history").insert({
      user_id: userId,
      tool_type: toolType,
      file_name: fileName,
      result_text: resultText,
      metadata,
    });

    if (error) {
      console.error(`[${toolType}] History save failed:`, error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[${toolType}] History save error:`, error);
    return false;
  }
}
