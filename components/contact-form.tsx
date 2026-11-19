"use client";

import { useState, type FormEvent } from "react";

export function ContactForm({ lang }: { lang: "en" | "fr" }) {
  const french = lang === "fr";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setSuccess(false);

    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          email: values.get("email"),
          message: values.get("message"),
          website: values.get("website"),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.code === "CONTACT_NOT_CONFIGURED") {
          throw new Error(french
            ? "Le formulaire n’est pas encore configuré. Écrivez-nous directement à ishakdev99@gmail.com."
            : "The contact form is not configured yet. Email us directly at ishakdev99@gmail.com.");
        }
        if (response.status === 429) {
          throw new Error(french
            ? "Trop de demandes. Réessayez dans une heure."
            : "Too many messages. Please try again in an hour.");
        }
        throw new Error(french
          ? "Votre message n’a pas pu être envoyé. Réessayez ou écrivez-nous par e-mail."
          : "Your message could not be sent. Please try again or contact us by email.");
      }

      form.reset();
      setSuccess(true);
      setMessage(french ? "Votre message a été envoyé à l’assistance." : "Your message was sent to support.");
    } catch (error) {
      setSuccess(false);
      setMessage(error instanceof Error ? error.message : (french ? "Une erreur s’est produite." : "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  const labels = french
    ? { heading: "Envoyer un message", name: "Nom", email: "Adresse e-mail", body: "Votre message", submit: "Envoyer le message", sending: "Envoi…" }
    : { heading: "Send a message", name: "Name", email: "Email address", body: "Your message", submit: "Send message", sending: "Sending…" };

  return <section aria-labelledby="contact-form-title" className="mt-10 border-t border-slate-200 pt-8">
    <h2 id="contact-form-title" className="text-xl font-bold text-slate-900">{labels.heading}</h2>
    <form onSubmit={submit} className="mt-5 space-y-4">
      <div>
        <label htmlFor="contact-name" className="mb-2 block text-sm font-medium text-slate-700">{labels.name}</label>
        <input id="contact-name" name="name" type="text" maxLength={120} autoComplete="name" className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm" />
      </div>
      <div>
        <label htmlFor="contact-email" className="mb-2 block text-sm font-medium text-slate-700">{labels.email}</label>
        <input id="contact-email" name="email" type="email" required maxLength={254} autoComplete="email" className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm" />
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-2 block text-sm font-medium text-slate-700">{labels.body}</label>
        <textarea id="contact-message" name="message" required maxLength={4000} rows={6} className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm" />
      </div>
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <button type="submit" disabled={busy} className="rounded-lg bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60">
        {busy ? labels.sending : labels.submit}
      </button>
      {message && <p role={success ? "status" : "alert"} className={`text-sm ${success ? "text-emerald-700" : "text-rose-700"}`}>{message}</p>}
    </form>
  </section>;
}
