import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HistoryClient from "./history-client";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login?next=/dashboard/history");
  }

  return <HistoryClient />;
}
