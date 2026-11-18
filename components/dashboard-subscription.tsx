"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, LoaderCircle } from "lucide-react";

type PlanPrice = { amountCents: number; currency: string; interval: "month" | "year" };
type State = { status: string; priceId: string | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; isPremium: boolean; totalUsed: number; totalLimit: number };

export default function DashboardSubscription({ language, checkout }: { language: "en" | "fr"; checkout?: string }) {
  const fr = language === "fr";
  const [state, setState] = useState<State | null>(null);
  const [prices, setPrices] = useState<{ monthly: PlanPrice | null; yearly: PlanPrice | null }>({ monthly: null, yearly: null });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/stripe/status", { cache: "no-store" });
      if (response.ok) setState(await response.json());
    } catch { /* Keep the existing dashboard visible when billing is temporarily unavailable. */ }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [statusResult, pricingResult] = await Promise.all([
        fetch("/api/stripe/status", { cache: "no-store" }),
        fetch("/api/stripe/pricing", { cache: "no-store" }),
      ]);
      if (mounted && statusResult.ok) setState(await statusResult.json());
      if (mounted && pricingResult.ok) setPrices(await pricingResult.json());
    };
    void load();
    const timer = checkout === "success" ? window.setInterval(() => void refresh(), 2500) : undefined;
    const stopTimer = checkout === "success" ? window.setTimeout(() => window.clearInterval(timer), 45000) : undefined;
    return () => { mounted = false; if (timer) window.clearInterval(timer); if (stopTimer) window.clearTimeout(stopTimer); };
  }, [checkout, refresh]);

  async function startCheckout(plan: "monthly" | "yearly") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, locale: language }) });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || (fr ? "Impossible de démarrer le paiement." : "Unable to start checkout."));
      window.location.assign(result.url);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : (fr ? "Une erreur est survenue." : "Something went wrong.")); setBusy(false); }
  }

  async function manage() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || (fr ? "Gestion indisponible." : "Billing management unavailable."));
      window.location.assign(result.url);
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : (fr ? "Une erreur est survenue." : "Something went wrong.")); setBusy(false); }
  }

  const money = (price: PlanPrice | null) => price ? new Intl.NumberFormat(fr ? "fr-FR" : "en-IE", { style: "currency", currency: price.currency.toUpperCase() }).format(price.amountCents / 100) : null;
  const date = state?.currentPeriodEnd ? new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", { dateStyle: "long" }).format(new Date(state.currentPeriodEnd)) : null;
  const status = state?.status ?? "inactive";
  const statusLabel: Record<string, string> = fr ? { active: "Actif", trialing: "Essai", past_due: "Paiement en retard", canceled: "Résilié", unpaid: "Impayé", incomplete: "En attente", incomplete_expired: "Expiré" } : { active: "Active", trialing: "Trial", past_due: "Payment past due", canceled: "Canceled", unpaid: "Unpaid", incomplete: "Pending", incomplete_expired: "Expired" };

  const totalUsed = Math.max(0, state?.totalUsed ?? 0);
  const totalLimit = Math.max(1, state?.totalLimit ?? 20);
  const usagePercent = Math.min(100, (totalUsed / totalLimit) * 100);

  return <section aria-labelledby="subscription-heading" className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <div className="mb-6">
      <p className="text-sm font-semibold text-violet-600">{fr ? "VOTRE ESPACE" : "YOUR WORKSPACE"}</p>
      <h2 id="subscription-heading" className="mt-2 text-2xl font-bold text-slate-900">{fr ? "Bienvenue sur SnapText AI !" : "Welcome to SnapText AI!"}</h2>
      <p className="mt-2 text-sm text-slate-500">{fr ? "Consultez votre abonnement et commencez à utiliser vos outils." : "Check your subscription and start using your tools."}</p>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-medium text-slate-500">{fr ? "VOTRE OFFRE ACTUELLE" : "YOUR CURRENT PLAN"}</p><h3 className="mt-1 text-xl font-bold text-slate-900">{state?.isPremium ? "SnapText AI Premium" : "SnapText AI Free"}</h3></div>
        <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">{state?.isPremium ? "PREMIUM" : "FREE"}</span>
        <div><p className="text-sm font-medium text-slate-500">{fr ? "STATUT DE L’ABONNEMENT" : "SUBSCRIPTION STATUS"}</p><p className="mt-1 text-sm font-semibold text-slate-800">{statusLabel[status] ?? status}</p></div>
      </div>
      {state?.isPremium ? <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm text-slate-600">{fr ? "Vous bénéficiez d’un accès illimité à tous les outils SnapText AI." : "You have unlimited access to all SnapText AI tools."}</p>
          {date && <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600"><CalendarDays size={15} />{state.cancelAtPeriodEnd ? (fr ? `Accès jusqu’au ${date}` : `Access until ${date}`) : (fr ? `Prochain renouvellement : ${date}` : `Next renewal: ${date}`)}</p>}
        </div>
        <button onClick={manage} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={16} /> : null}{fr ? "Gérer mon abonnement" : "Manage subscription"}<ArrowUpRight size={15} /></button>
      </div> : <>
        <div className="mt-5 flex justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{fr ? "Utilisation gratuite de vos outils" : "Lifetime usage across all tools"}</span><span className="font-semibold text-violet-700">{totalUsed}/{totalLimit}</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${usagePercent}%` }} /></div>
        <p className="mt-3 text-sm text-slate-500">{fr ? "Chaque outil comprend 2 utilisations gratuites à vie." : "You get two free lifetime uses for each individual tool."}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => void startCheckout("monthly")} disabled={busy || !prices.monthly} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60">{busy ? <LoaderCircle className="mr-2 inline animate-spin" size={15} /> : null}{fr ? "Mensuel" : "Upgrade to Pro"}{prices.monthly ? ` — ${money(prices.monthly)}/${fr ? "mois" : "month"}` : ""}</button>
          <button onClick={() => void startCheckout("yearly")} disabled={busy || !prices.yearly} className="rounded-xl border border-violet-300 bg-white px-4 py-3 text-sm font-bold text-violet-800 hover:bg-violet-50 disabled:opacity-60">{fr ? "Annuel" : "Yearly"}{prices.yearly ? ` · ${money(prices.yearly)}/${fr ? "an" : "year"}` : ""}</button>
        </div>
      </>}
      {checkout === "success" && <p role="status" className="mt-4 text-sm font-medium text-emerald-700">{fr ? "Paiement confirmé. Synchronisation de votre abonnement…" : "Payment received. Syncing your subscription…"}</p>}
      {checkout === "cancelled" && <p role="status" className="mt-4 text-sm text-amber-700">{fr ? "Paiement annulé. Aucun montant n’a été débité." : "Checkout canceled. You have not been charged."}</p>}
      {message && <p role="alert" className="mt-4 text-sm font-medium text-rose-700">{message}</p>}
    </div>
  </section>;
}
