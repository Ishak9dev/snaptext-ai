import { redirect } from "next/navigation";
import OcrWorkspace from "@/components/ocr-workspace";
import { createClient } from "@/lib/supabase/server";


export default async function ImageToTextPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/login?next=/dashboard/image-to-text");
  }
  return <OcrWorkspace />;
}
