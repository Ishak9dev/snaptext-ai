"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Preferences = { necessary: true; analytics: boolean; advertising: boolean; savedAt: number };
const KEY = "snaptext-cookie-preferences-v1";
const fresh = (): Preferences => ({ necessary: true, analytics: false, advertising: false, savedAt: Date.now() });

export function openCookieSettings() { window.dispatchEvent(new Event("snaptext:cookie-settings")); }

export function CookieConsent() {
  const pathname = usePathname();
  const fr = pathname.startsWith("/fr");
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);

  useEffect(() => {
    const load = () => {
      const raw = localStorage.getItem(KEY);
      if (!raw) { setOpen(true); return; }
      try {
        const value = JSON.parse(raw) as Preferences;
        if (Date.now() - value.savedAt > 180 * 24 * 60 * 60 * 1000) { setOpen(true); return; }
        setAnalytics(Boolean(value.analytics)); setAdvertising(Boolean(value.advertising));
      } catch { setOpen(true); }
    };
    const settings = () => { load(); setCustomize(true); setOpen(true); };
    load();
    window.addEventListener("snaptext:cookie-settings", settings);
    return () => window.removeEventListener("snaptext:cookie-settings", settings);
  }, []);

  function save(next: Preferences) {
    localStorage.setItem(KEY, JSON.stringify(next));
    setAnalytics(next.analytics); setAdvertising(next.advertising); setOpen(false); setCustomize(false);
  }

  if (!open) return null;
  const labels = fr
    ? { title: "Vos choix de confidentialité", text: "Les stockages essentiels assurent la sécurité et les fonctions demandées. Aucun outil d’analyse ou de publicité n’est actuellement activé.", accept: "Tout accepter", reject: "Tout refuser", customize: "Personnaliser", save: "Enregistrer mes choix", essential: "Essentiels (toujours actifs)", analytics: "Statistiques", advertising: "Publicité" }
    : { title: "Your privacy choices", text: "Essential storage supports security and requested features. No analytics or advertising tool is currently enabled.", accept: "Accept all", reject: "Reject all", customize: "Customize", save: "Save my choices", essential: "Essential (always active)", analytics: "Analytics", advertising: "Advertising" };
  return <div role="dialog" aria-modal="true" aria-labelledby="cookie-title" className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
    <h2 id="cookie-title" className="text-lg font-bold text-slate-900">{labels.title}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">{labels.text}</p>
    {customize && <fieldset className="mt-4 space-y-3 text-sm text-slate-700">
      <label className="flex items-center gap-3"><input type="checkbox" checked disabled />{labels.essential}</label>
      <label className="flex items-center gap-3"><input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />{labels.analytics}</label>
      <label className="flex items-center gap-3"><input type="checkbox" checked={advertising} onChange={(e) => setAdvertising(e.target.checked)} />{labels.advertising}</label>
    </fieldset>}
    <div className="mt-5 flex flex-wrap gap-2">
      <button onClick={() => save(fresh())} className="rounded-lg border border-violet-700 px-4 py-2.5 text-sm font-semibold text-violet-800 hover:bg-violet-50">{labels.reject}</button>
      <button onClick={() => customize ? save({ necessary: true, analytics, advertising, savedAt: Date.now() }) : setCustomize(true)} className="rounded-lg border border-violet-700 px-4 py-2.5 text-sm font-semibold text-violet-800 hover:bg-violet-50">{customize ? labels.save : labels.customize}</button>
      <button onClick={() => save({ necessary: true, analytics: true, advertising: true, savedAt: Date.now() })} className="rounded-lg border border-violet-700 px-4 py-2.5 text-sm font-semibold text-violet-800 hover:bg-violet-50">{labels.accept}</button>
    </div>
  </div>;
}
