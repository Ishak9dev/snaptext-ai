import type { Metadata } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import DashboardNavigation from "@/components/dashboard-navigation";
import DashboardBackLink from "@/components/dashboard-back-link";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

// French dashboard pages also validate the Supabase session per request.
export const instant = false;

export default async function FrenchDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await connection();
  return (
    <>
      <DashboardNavigation />
      <DashboardBackLink />
      {children}
    </>
  );
}
