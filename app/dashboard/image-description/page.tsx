import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ImageDescriptionWorkspace from "@/components/image-description-workspace";

export default async function ImageDescriptionPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/login?next=/dashboard/image-description");
  }

  return <ImageDescriptionWorkspace />;
}
