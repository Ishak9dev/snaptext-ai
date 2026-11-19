"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function AccountSettings() {
  const french = usePathname().startsWith("/fr/");
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setEmail(data.user?.email ?? "");
      const metadata = data.user?.user_metadata;
      setName(typeof metadata?.full_name === "string" ? metadata.full_name : typeof metadata?.name === "string" ? metadata.name : "");
    });
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const updates: { email?: string; data?: Record<string, string> } = {};
      if (email.trim() && email.trim() !== user.email) updates.email = email.trim();
      const existingName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? "";
      if (name.trim() !== existingName) updates.data = { ...user.user_metadata, full_name: name.trim() };
      if (Object.keys(updates).length === 0) {
        setMessage(french ? "Aucune modification à enregistrer." : "There are no changes to save.");
        return;
      }
      const { data, error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      if (data.user) setUser(data.user);
      setMessage(updates.email
        ? (french ? "Confirmez la nouvelle adresse via l’e-mail envoyé par Supabase." : "Confirm the new address using the email sent by Supabase.")
        : (french ? "Nom du compte mis à jour." : "Account name updated."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (french ? "Mise à jour impossible." : "Unable to update account details."));
    } finally {
      setBusy(false);
    }
  }

  return <main lang={french ? "fr" : "en"} className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
    <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900">{french ? "Paramètres du compte" : "Account settings"}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{french ? "Consultez et corrigez les informations de compte enregistrées dans Supabase Authentication." : "View and correct account information stored in Supabase Authentication."}</p>
      {user ? <form onSubmit={save} className="mt-6 space-y-5">
        <div><label htmlFor="account-email" className="mb-2 block text-sm font-medium text-slate-700">{french ? "Adresse e-mail" : "Email address"}</label><input id="account-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm" /></div>
        <div><label htmlFor="account-name" className="mb-2 block text-sm font-medium text-slate-700">{french ? "Nom affiché" : "Display name"}</label><input id="account-name" type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm" /></div>
        {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
        <button type="submit" disabled={busy} className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? (french ? "Enregistrement…" : "Saving…") : (french ? "Enregistrer les modifications" : "Save changes")}</button>
      </form> : <p className="mt-6 text-sm text-slate-600">{french ? "Chargement du compte…" : "Loading account…"}</p>}
      <div className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="font-semibold text-slate-900">{french ? "Vos données" : "Your data"}</h2>
        <a href="/api/privacy/export" className="mt-3 inline-block text-sm font-semibold text-violet-700 underline">{french ? "Télécharger mes données" : "Download my data"}</a>
      </div>
    </section>
  </main>;
}
