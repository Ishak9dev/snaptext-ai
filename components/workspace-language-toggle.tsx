"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function WorkspaceLanguageToggle() {
  const pathname = usePathname();
  const isFrench = pathname === "/fr/dashboard" || pathname.startsWith("/fr/dashboard/");

  let target: string;
  if (isFrench) {
    const englishPath = pathname.replace(/^\/fr/, "");
    target = englishPath || "/";
  } else {
    const suffix = pathname.replace(/^\/dashboard/, "");
    target = suffix === "" ? "/fr/dashboard" : `/fr/dashboard${suffix}`;
  }

  return (
    <Link
      href={target}
      hrefLang={isFrench ? "en" : "fr"}
      lang={isFrench ? "en" : "fr"}
      className="fixed right-4 top-4 z-[100] rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-md backdrop-blur transition hover:border-violet-300 hover:text-violet-700"
      aria-label={isFrench ? "Switch to English" : "Passer en français"}
    >
      {isFrench ? "EN" : "FR"}
    </Link>
  );
}
