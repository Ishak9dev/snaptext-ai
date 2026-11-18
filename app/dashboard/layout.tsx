import type { Metadata } from "next";
import type { ReactNode } from "react";
import WorkspaceLanguageToggle from "@/components/workspace-language-toggle";
import DashboardBackLink from "@/components/dashboard-back-link";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

// Dashboard pages validate a user session at request time. Keep those reads
// out of the static shell until they can be streamed behind Suspense.
export const instant = false;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardBackLink />
      {children}
      <WorkspaceLanguageToggle />
    </>
  );
}
