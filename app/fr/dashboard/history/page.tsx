import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HistoryClient from "@/app/dashboard/history/history-client";

export default async function FrenchHistoryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login?next=/fr/dashboard/history");
  }

  return <HistoryClient />;
}
