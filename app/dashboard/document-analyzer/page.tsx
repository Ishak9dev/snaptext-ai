import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DocumentAnalyzerWorkspace from "@/components/document-analyzer-workspace";

export default async function DocumentAnalyzerPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/login?next=/dashboard/document-analyzer");
  }

  return <DocumentAnalyzerWorkspace />;
}
