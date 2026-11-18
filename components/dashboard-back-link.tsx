"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { useWorkspaceLanguage, useWorkspaceTranslation } from "@/lib/workspace-i18n";

export default function DashboardBackLink() {
  const pathname = usePathname();
  const language = useWorkspaceLanguage();
  const translate = useWorkspaceTranslation();

  if (pathname === "/dashboard" || pathname === "/fr/dashboard") return null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6 lg:px-8">
      <Link
        href={language === "fr" ? "/fr/dashboard" : "/dashboard"}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
      >
        <ArrowLeft size={17} aria-hidden="true" />
        {translate("Back to Dashboard")}
      </Link>
    </div>
  );
}
