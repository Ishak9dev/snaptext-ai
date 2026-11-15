"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Languages,
  Menu,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
  Zap,
  ScanText,
  Copy,
  Download,
  History,
  Image as ImageIcon,
} from "lucide-react";

type Language = "en" | "fr";

const translations = {
  en: {
    navFeatures: "Features",
    navHow: "How it works",
    navPricing: "Pricing",
    login: "Log in",
    signup: "Get started",
    badge: "Simple image to text extraction",
    title: "Turn any image into",
    titleAccent: "editable text.",
    subtitle:
      "Extract text from photos, screenshots and documents in seconds. Simple, fast and easy to use.",
    upload: "Start extracting text",
    uploadHint:
      "Create your free account and upload an image to get started.",
    formats: "PNG, JPG, JPEG or WEBP",
    free: "Free to get started",
    noCard: "No credit card required",
    featuresTitle: "Everything you need to extract text",
    featuresSubtitle:
      "Simple tools to turn images into useful, editable content.",
    feature1: "Text extraction",
    feature1Desc:
      "Extract printed text from photos, screenshots and scanned documents.",
    feature2: "English and French",
    feature2Desc:
      "Choose English, French or both for your text recognition.",
    feature3: "Fast processing",
    feature3Desc:
      "Extract text directly in your browser using our OCR engine.",
    feature4: "Image support",
    feature4Desc:
      "Upload PNG, JPG, JPEG and WEBP images up to 10 MB.",
    feature5: "Copy and download",
    feature5Desc:
      "Copy your extracted text or download it as a TXT file.",
    feature6: "Extraction history",
    feature6Desc:
      "Save your results and access them later from your account.",
    howTitle: "Three steps. That's it.",
    howSubtitle: "Extract text without complicated software.",
    step1: "Create your account",
    step1Desc:
      "Sign up for free to access your personal workspace.",
    step2: "Upload your image",
    step2Desc:
      "Choose a photo, screenshot or scanned document.",
    step3: "Get your text",
    step3Desc:
      "Extract, edit, copy, download and save your text.",
    pricingTitle: "Simple pricing",
    pricingSubtitle:
      "Start using SnapText AI for free. More plans are coming soon.",
    monthly: "Free",
    starter: "Starter",
    pro: "Pro",
    freePrice: "€0",
    starterPrice: "Coming soon",
    proPrice: "Coming soon",
    perMonth: "/ month",
    freeFeature1: "Image text extraction",
    freeFeature2: "English and French OCR",
    freeFeature3: "Copy and TXT download",
    starterFeature1: "More monthly extractions",
    starterFeature2: "Advanced features",
    starterFeature3: "Extraction history",
    starterFeature4: "Coming soon",
    proFeature1: "Higher usage limits",
    proFeature2: "Everything in Starter",
    proFeature3: "Additional tools",
    proFeature4: "Coming soon",
    popular: "Coming soon",
    choose: "Get started",
    ctaTitle: "Ready to turn images into text?",
    ctaDesc:
      "Create your free account and start extracting text from your images today.",
    footerDesc:
      "The simple way to turn images into editable text.",
    product: "Product",
    account: "Account",
    legal: "Information",
    privacy: "Privacy policy coming soon",
    terms: "Terms of service coming soon",
    rights: "All rights reserved.",
    dashboard: "Dashboard",
    history: "My history",
    uploadButton: "Open the OCR workspace",
    uploadNote: "Your OCR workspace is waiting for you.",
    pricingNote:
      "Paid plans and subscription billing are not available yet.",
  },

  fr: {
    navFeatures: "Fonctionnalités",
    navHow: "Comment ça marche",
    navPricing: "Tarifs",
    login: "Connexion",
    signup: "Commencer",
    badge: "Extraction simple d'image en texte",
    title: "Transformez vos images en",
    titleAccent: "texte modifiable.",
    subtitle:
      "Extrayez le texte de vos photos, captures d'écran et documents en quelques secondes. Simple, rapide et pratique.",
    upload: "Commencer l'extraction",
    uploadHint:
      "Créez votre compte gratuit et importez une image pour commencer.",
    formats: "PNG, JPG, JPEG ou WEBP",
    free: "Gratuit pour commencer",
    noCard: "Sans carte bancaire",
    featuresTitle: "Tout pour extraire votre texte",
    featuresSubtitle:
      "Des outils simples pour transformer vos images en contenu modifiable.",
    feature1: "Extraction de texte",
    feature1Desc:
      "Extrayez le texte imprimé de photos, captures d'écran et documents numérisés.",
    feature2: "Anglais et français",
    feature2Desc:
      "Choisissez l'anglais, le français ou les deux pour la reconnaissance.",
    feature3: "Traitement rapide",
    feature3Desc:
      "Extrayez le texte directement dans votre navigateur grâce à notre moteur OCR.",
    feature4: "Formats d'image",
    feature4Desc:
      "Importez des images PNG, JPG, JPEG et WEBP jusqu'à 10 Mo.",
    feature5: "Copier et télécharger",
    feature5Desc:
      "Copiez votre texte extrait ou téléchargez-le au format TXT.",
    feature6: "Historique des extractions",
    feature6Desc:
      "Enregistrez vos résultats et retrouvez-les depuis votre compte.",
    howTitle: "Trois étapes. C'est tout.",
    howSubtitle: "Extrayez du texte sans logiciel compliqué.",
    step1: "Créez votre compte",
    step1Desc:
      "Inscrivez-vous gratuitement pour accéder à votre espace personnel.",
    step2: "Importez votre image",
    step2Desc:
      "Choisissez une photo, une capture ou un document numérisé.",
    step3: "Récupérez votre texte",
    step3Desc:
      "Extrayez, modifiez, copiez, téléchargez et enregistrez votre texte.",
    pricingTitle: "Des tarifs simples",
    pricingSubtitle:
      "Commencez gratuitement avec SnapText AI. D'autres offres arrivent bientôt.",
    monthly: "Gratuit",
    starter: "Starter",
    pro: "Pro",
    freePrice: "0 €",
    starterPrice: "Bientôt disponible",
    proPrice: "Bientôt disponible",
    perMonth: "/ mois",
    freeFeature1: "Extraction de texte depuis une image",
    freeFeature2: "OCR anglais et français",
    freeFeature3: "Copie et téléchargement TXT",
    starterFeature1: "Plus d'extractions mensuelles",
    starterFeature2: "Fonctionnalités avancées",
    starterFeature3: "Historique des extractions",
    starterFeature4: "Bientôt disponible",
    proFeature1: "Limites d'utilisation supérieures",
    proFeature2: "Tout le contenu Starter",
    proFeature3: "Outils supplémentaires",
    proFeature4: "Bientôt disponible",
    popular: "Bientôt disponible",
    choose: "Commencer",
    ctaTitle: "Prêt à transformer vos images en texte ?",
    ctaDesc:
      "Créez votre compte gratuit et commencez à extraire du texte dès aujourd'hui.",
    footerDesc:
      "La solution simple pour transformer vos images en texte modifiable.",
    product: "Produit",
    account: "Compte",
    legal: "Informations",
    privacy: "Politique de confidentialité bientôt disponible",
    terms: "Conditions d'utilisation bientôt disponibles",
    rights: "Tous droits réservés.",
    dashboard: "Tableau de bord",
    history: "Mon historique",
    uploadButton: "Ouvrir l'espace OCR",
    uploadNote: "Votre espace OCR vous attend.",
    pricingNote:
      "Les offres payantes et les abonnements ne sont pas encore disponibles.",
  },
};

const featureIcons = [
  ScanText,
  Languages,
  Zap,
  ImageIcon,
  Download,
  History,
];

const howIcons = [ShieldCheck, UploadCloud, FileText];

export default function Home() {
  const [lang, setLang] = useState<Language>("en");
  const [mobileOpen, setMobileOpen] = useState(false);

  const t = translations[lang];

  const features = [
    [t.feature1, t.feature1Desc],
    [t.feature2, t.feature2Desc],
    [t.feature3, t.feature3Desc],
    [t.feature4, t.feature4Desc],
    [t.feature5, t.feature5Desc],
    [t.feature6, t.feature6Desc],
  ];

  const steps = [
    [t.step1, t.step1Desc],
    [t.step2, t.step2Desc],
    [t.step3, t.step3Desc],
  ];

  const plans = [
    {
      name: t.monthly,
      price: t.freePrice,
      features: [t.freeFeature1, t.freeFeature2, t.freeFeature3],
      available: true,
      popular: false,
    },
    {
      name: t.starter,
      price: t.starterPrice,
      features: [
        t.starterFeature1,
        t.starterFeature2,
        t.starterFeature3,
        t.starterFeature4,
      ],
      available: false,
      popular: false,
    },
    {
      name: t.pro,
      price: t.proPrice,
      features: [
        t.proFeature1,
        t.proFeature2,
        t.proFeature3,
        t.proFeature4,
      ],
      available: false,
      popular: false,
    },
  ];

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            onClick={closeMobileMenu}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200">
              <ScanText size={23} />
            </div>

            <span className="text-xl font-bold tracking-tight">
              SnapText <span className="text-violet-600">AI</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-slate-600 hover:text-violet-600"
            >
              {t.navFeatures}
            </a>

            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 hover:text-violet-600"
            >
              {t.navHow}
            </a>

            <a
              href="#pricing"
              className="text-sm font-medium text-slate-600 hover:text-violet-600"
            >
              {t.navPricing}
            </a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={() => setLang(lang === "en" ? "fr" : "en")}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              aria-label="Change language"
            >
              <Languages size={17} />
              {lang.toUpperCase()}
              <ChevronDown size={14} />
            </button>

            <Link
              href="/login"
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              {t.login}
            </Link>

            <Link
              href="/signup"
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700"
            >
              {t.signup}
            </Link>
          </div>

          <button
            className="rounded-lg p-2 text-slate-700 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-100 bg-white p-5 md:hidden">
            <nav className="flex flex-col gap-5">
              <a href="#features" onClick={closeMobileMenu}>
                {t.navFeatures}
              </a>

              <a href="#how-it-works" onClick={closeMobileMenu}>
                {t.navHow}
              </a>

              <a href="#pricing" onClick={closeMobileMenu}>
                {t.navPricing}
              </a>

              <button
                onClick={() => setLang(lang === "en" ? "fr" : "en")}
                className="text-left font-semibold text-violet-600"
              >
                {lang === "en"
                  ? "Passer en français"
                  : "Switch to English"}
              </button>

              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="rounded-lg border border-slate-200 py-3 text-center font-semibold text-slate-700"
              >
                {t.login}
              </Link>

              <Link
                href="/signup"
                onClick={closeMobileMenu}
                className="rounded-lg bg-violet-600 py-3 text-center font-semibold text-white"
              >
                {t.signup}
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-violet-50/80 via-white to-white px-5 pb-20 pt-20 lg:pt-28">
        <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl" />

        <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-purple-200/30 blur-3xl" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-7 flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
            <Sparkles size={16} />
            {t.badge}
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-7xl">
            {t.title}

            <span className="block bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-transparent">
              {t.titleAccent}
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-600">
            {t.subtitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <Check size={16} className="text-violet-600" />
              {t.free}
            </span>

            <span className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-violet-600" />
              {t.noCard}
            </span>
          </div>

          {/* CONNECTED UPLOAD CTA */}
          <div
            id="upload"
            className="mx-auto mt-12 max-w-2xl scroll-mt-28"
          >
            <div className="rounded-3xl border-2 border-dashed border-violet-300 bg-white p-8 shadow-xl shadow-violet-100/60 sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <UploadCloud size={32} />
              </div>

              <h3 className="mt-5 text-xl font-bold text-slate-900">
                {t.upload}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {t.uploadHint}
              </p>

              <p className="mt-3 text-xs text-slate-400">
                {t.formats} · Max 10 MB
              </p>

              <Link
                href="/signup"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
              >
                <ImageIcon size={18} />
                {t.uploadButton}
                <ArrowRight size={17} />
              </Link>

              <p className="mt-4 text-xs text-slate-400">
                {t.uploadNote}
              </p>
            </div>
          </div>

          <div className="mx-auto mt-12 flex max-w-xl flex-wrap justify-center gap-4 text-xs font-medium text-slate-400">
            <span>JPG</span>
            <span>•</span>
            <span>PNG</span>
            <span>•</span>
            <span>WEBP</span>
            <span>•</span>
            <span>OCR</span>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="scroll-mt-24 px-5 py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-violet-600">
              Features
            </span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              {t.featuresTitle}
            </h2>

            <p className="mt-4 leading-7 text-slate-500">
              {t.featuresSubtitle}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, desc], i) => {
              const Icon = featureIcons[i];

              return (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-100 bg-white p-7 transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <Icon size={23} />
                  </div>

                  <h3 className="mt-6 text-lg font-bold text-slate-900">
                    {title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="scroll-mt-24 bg-slate-50 px-5 py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-violet-600">
              Simple workflow
            </span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              {t.howTitle}
            </h2>

            <p className="mt-4 text-slate-500">
              {t.howSubtitle}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map(([title, desc], i) => {
              const Icon = howIcons[i];

              return (
                <div
                  key={title}
                  className="relative rounded-2xl bg-white p-8 text-center shadow-sm"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                    <Icon size={30} />
                  </div>

                  <div className="mx-auto mt-5 flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                    {i + 1}
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-900">
                    {title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        className="scroll-mt-24 px-5 py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-violet-600">
              Pricing
            </span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              {t.pricingTitle}
            </h2>

            <p className="mt-4 text-slate-500">
              {t.pricingSubtitle}
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 ${
                  plan.popular
                    ? "border-violet-500 bg-violet-50/50 shadow-xl shadow-violet-100"
                    : "border-slate-200 bg-white"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-violet-600 px-4 py-1 text-xs font-bold text-white">
                    {t.popular}
                  </span>
                )}

                <h3 className="text-lg font-bold text-slate-900">
                  {plan.name}
                </h3>

                <div className="mt-5 flex min-h-12 items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-950">
                    {plan.price}
                  </span>

                  {plan.available && (
                    <span className="text-sm text-slate-500">
                      {t.perMonth}
                    </span>
                  )}
                </div>

                {plan.available ? (
                  <Link
                    href="/signup"
                    className="mt-7 block w-full rounded-xl bg-violet-600 py-3 text-center text-sm font-bold text-white transition hover:bg-violet-700"
                  >
                    {t.choose}
                  </Link>
                ) : (
                  <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 py-3 text-center text-sm font-semibold text-slate-400">
                    {t.popular}
                  </div>
                )}

                <div className="my-7 border-t border-slate-200" />

                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-slate-600"
                    >
                      <Check
                        size={17}
                        className="mt-0.5 shrink-0 text-violet-600"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            {t.pricingNote}
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-5 pb-24">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 to-purple-600 px-7 py-16 text-center text-white shadow-2xl shadow-violet-200 sm:px-14">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <Zap size={28} />
          </div>

          <h2 className="mt-6 text-3xl font-extrabold sm:text-4xl">
            {t.ctaTitle}
          </h2>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-violet-100">
            {t.ctaDesc}
          </p>

          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 font-bold text-violet-700 transition hover:bg-violet-50"
          >
            {t.signup}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white px-5 py-12">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-sm">
            <Link
              href="/"
              className="flex items-center gap-2.5"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white">
                <ScanText size={20} />
              </div>

              <span className="text-lg font-bold">
                SnapText{" "}
                <span className="text-violet-600">AI</span>
              </span>
            </Link>

            <p className="mt-4 text-sm leading-7 text-slate-500">
              {t.footerDesc}
            </p>
          </div>

          <div className="flex flex-wrap gap-12 sm:gap-16">
            <div>
              <h4 className="font-bold text-slate-900">
                {t.product}
              </h4>

              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500">
                <a href="#features" className="hover:text-violet-600">
                  {t.navFeatures}
                </a>

                <a href="#how-it-works" className="hover:text-violet-600">
                  {t.navHow}
                </a>

                <a href="#pricing" className="hover:text-violet-600">
                  {t.navPricing}
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900">
                {t.account}
              </h4>

              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500">
                <Link href="/signup" className="hover:text-violet-600">
                  {t.signup}
                </Link>

                <Link href="/login" className="hover:text-violet-600">
                  {t.login}
                </Link>

                <Link href="/dashboard" className="hover:text-violet-600">
                  {t.dashboard}
                </Link>

                <Link
                  href="/dashboard/history"
                  className="hover:text-violet-600"
                >
                  {t.history}
                </Link>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900">
                {t.legal}
              </h4>

              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
                <span>{t.privacy}</span>
                <span>{t.terms}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-slate-100 pt-7 text-center text-xs text-slate-400">
          © 2026 SnapText AI. {t.rights}
        </div>
      </footer>
    </main>
  );
}