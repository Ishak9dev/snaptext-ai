import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReceiptScannerWorkspace from "@/components/receipt-scanner-workspace";

export default async function ReceiptScannerPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/login?next=/dashboard/receipt-scanner");
  }

  return <ReceiptScannerWorkspace />;
}
