
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FormExtractorWorkspace from "@/components/form-extractor-workspace";

export const metadata = {
  title: "Form & Data Extractor | SnapText AI",
  description:
    "Extract form fields, tables, checkboxes and structured data from documents using AI.",
};

export default async function FormExtractorPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/login?next=/dashboard/form-extractor");
  }

  return (
    <main className="min-h-screen">
      <FormExtractorWorkspace />
    </main>
  );
}
