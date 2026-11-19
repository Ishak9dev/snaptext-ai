import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/account-settings";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Paramètres du compte", robots: { index: false, follow: false } };

export default async function FrenchAccountSettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect("/login?next=%2Ffr%2Fdashboard%2Faccount");
  return <AccountSettings />;
}
