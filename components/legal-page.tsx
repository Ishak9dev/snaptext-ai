import Link from "next/link";
import { CookieSettingsButton } from "@/components/cookie-settings-button";
import { ContactForm } from "@/components/contact-form";

export type LegalSection = { title: string; body: string[] };

export function LegalPage({ lang, title, intro, sections, contactForm = false }: {
  lang: "en" | "fr"; title: string; intro: string; sections: LegalSection[];
  contactForm?: boolean;
}) {
  return <main lang={lang} className="min-h-screen bg-slate-50 px-5 py-12">
    <article className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-12">
      <Link href={lang === "fr" ? "/fr" : "/"} className="text-sm font-semibold text-violet-700">SnapText AI</Link>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
      <p className="mt-4 leading-7 text-slate-600">{intro}</p>
      <div className="mt-9 space-y-8">{sections.map((section) => <section key={section.title}>
        <h2 className="text-xl font-bold text-slate-900">{section.title}</h2>
        <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">{section.body.map((p, i) => <p key={i}>{p}</p>)}</div>
      </section>)}</div>
      {contactForm && <ContactForm lang={lang} />}
      <nav aria-label={lang === "fr" ? "Pages juridiques" : "Legal pages"} className="mt-12 flex flex-wrap gap-x-5 gap-y-3 border-t border-slate-200 pt-6 text-sm text-violet-700">
        {(lang === "fr" ? [["Confidentialité", "privacy"], ["Conditions d’utilisation", "terms"], ["Vente", "sale-terms"], ["Mentions légales", "legal-notice"], ["Cookies", "cookies"], ["Rétractation et remboursements", "refunds"], ["Contact et demandes RGPD", "contact"]] : [["Privacy", "privacy"], ["Terms of Service", "terms"], ["Terms of Sale", "sale-terms"], ["Legal Notice", "legal-notice"], ["Cookies", "cookies"], ["Withdrawal and refunds", "refunds"], ["Contact and privacy requests", "contact"]]).map(([label, slug]) => <Link key={slug} href={`${lang === "fr" ? "/fr" : ""}/legal/${slug}`} className="hover:underline">{label}</Link>)}
      </nav>
      <div className="mt-5 text-sm"><CookieSettingsButton lang={lang} /></div>
    </article>
  </main>;
}
