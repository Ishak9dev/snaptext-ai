
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardHome from "@/components/dashboard-home";

export const instant = false;

export default async function BackgroundRemoverPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  const { checkout } = await searchParams;
  return <DashboardHome checkout={checkout} />;
}
