import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardHome from "@/components/dashboard-home";


export default async function FrenchDashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/login?next=/fr/dashboard");
  return <DashboardHome language="fr" />;
}
