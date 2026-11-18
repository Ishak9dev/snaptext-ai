"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Languages, LogOut, Menu, UserCircle2, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function DashboardNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const isFrench = pathname === "/fr/dashboard" || pathname.startsWith("/fr/dashboard/");
  const dashboardPath = isFrench ? "/fr/dashboard" : "/dashboard";
  const historyPath = isFrench ? "/fr/dashboard/history" : "/dashboard/history";
  const languagePath = useMemo(() => isFrench ? pathname.replace(/^\/fr/, "") || "/" : pathname.replace(/^\/dashboard/, "/fr/dashboard"), [isFrench, pathname]);
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const metadataName = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
  const displayName = (typeof metadataName === "string" ? metadataName : "") || user?.email?.split("@")[0] || (isFrench ? "Compte" : "Account");

  async function manageSubscription() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.url) throw new Error("Unable to open billing portal");
      window.location.assign(payload.url);
    } catch (error) {
      console.error("Billing portal error", error);
      setBusy(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) return;
    router.push(isFrench ? "/fr" : "/");
  }

  return <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
      <Link href={dashboardPath} className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white"><UserCircle2 size={20} /></span>
        <span className="text-lg font-bold tracking-tight text-slate-900">SnapText <span className="text-violet-600">AI</span></span>
      </Link>
      <div className="hidden items-center gap-3 md:flex">
        <Link href={dashboardPath} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-violet-50 hover:text-violet-700">{isFrench ? "Tableau de bord" : "Dashboard"}</Link>
        <Link href={historyPath} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-violet-50 hover:text-violet-700">{isFrench ? "Historique" : "History"}</Link>
        <Link href={languagePath} hrefLang={isFrench ? "en" : "fr"} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" aria-label={isFrench ? "Switch to English" : "Passer en français"}>
          <Languages size={16} />{isFrench ? "EN" : "FR"}<ChevronDown size={13} />
        </Link>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} className="flex max-w-56 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">
            <UserCircle2 size={19} className="shrink-0 text-violet-600" /><span className="max-w-36 truncate text-sm font-semibold text-slate-700">{displayName}</span><ChevronDown size={14} />
          </button>
          {menuOpen && <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            <div className="border-b border-slate-100 px-3 py-3"><p className="truncate text-sm font-semibold text-slate-900">{displayName}</p><p className="truncate text-xs text-slate-500">{user?.email}</p></div>
            <button type="button" onClick={manageSubscription} disabled={busy} className="mt-2 block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50">{isFrench ? "Gérer l’abonnement" : "Manage subscription"}</button>
            <button type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"><LogOut size={16} />{isFrench ? "Déconnexion" : "Sign out"}</button>
          </div>}
        </div>
      </div>
      <button type="button" className="rounded-lg p-2 text-slate-700 md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen}>{mobileOpen ? <X /> : <Menu />}</button>
    </div>
    {mobileOpen && <nav aria-label={isFrench ? "Navigation de l’espace" : "Workspace navigation"} className="border-t border-slate-100 bg-white px-5 py-4 md:hidden">
      <Link onClick={() => setMobileOpen(false)} href={dashboardPath} className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-violet-50">{isFrench ? "Tableau de bord" : "Dashboard"}</Link>
      <Link onClick={() => setMobileOpen(false)} href={historyPath} className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-violet-50">{isFrench ? "Historique" : "History"}</Link>
      <Link onClick={() => setMobileOpen(false)} href={languagePath} className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold text-violet-700"><Languages size={16} />{isFrench ? "Switch to English" : "Passer en français"}</Link>
      <div className="mt-2 border-t border-slate-100 px-3 pt-4"><p className="truncate text-sm font-semibold text-slate-900">{displayName}</p><p className="truncate text-xs text-slate-500">{user?.email}</p>
        <button type="button" onClick={manageSubscription} disabled={busy} className="mt-3 block w-full py-2 text-left text-sm font-medium text-slate-700">{isFrench ? "Gérer l’abonnement" : "Manage subscription"}</button>
        <button type="button" onClick={signOut} className="flex w-full items-center gap-2 py-2 text-left text-sm font-medium text-rose-600"><LogOut size={16} />{isFrench ? "Déconnexion" : "Sign out"}</button>
      </div>
    </nav>}
  </header>;
}
