
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  BrainCircuit,
  ReceiptText,
  ClipboardList,
  ArrowRight,
  Check,
  FileImage,
  FileText,
  Languages,
  Menu,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
  Zap,
  ScanText,
  Download,
  History,
  Image as ImageIcon,
  RefreshCw,
  Minimize2,
  Scissors,
  LockKeyhole,
  
} from "lucide-react";

type Language = "en" | "fr";

const translations = {
  en: {
    toolAnalyzer: "Smart Document Analyzer",
toolAnalyzerDesc: "Analyze documents and extract key information with AI.",

toolDescription: "AI Image Description",
toolDescriptionDesc: "Generate clear, detailed descriptions of your images with AI.",

toolReceipt: "Receipt & Invoice Scanner",
toolReceiptDesc: "Extract merchant details, dates, totals and line items from receipts and invoices.",

toolDetection: "AI Object Detection",
toolDetectionDesc: "Detect and identify objects in your images with AI.",

toolForm: "Form & Data Extractor",
toolFormDesc: "Extract structured data from forms and documents.",
    navFeatures: "Features",
    navTools: "Our tools",
    navHow: "How it works",
    navPricing: "Pricing",
    login: "Log in",
    signup: "Get started",

    badge: "Your all-in-one image toolkit",
    title: "AI image and document tools",
    titleAccent: "for everyday work.",
    subtitle:
      "Extract text, convert images to PDF, change formats, compress images and more — all in one simple workspace.",

    upload: "Explore our image tools",
    uploadHint:
      "Create your free account and access all ten tools from one workspace.",
    formats: "JPG, PNG, WEBP",
    free: "2 free lifetime uses per tool",
    noCard: "No credit card required",

    toolsLabel: "OUR IMAGE TOOLS",
    toolsTitle: "One platform. Ten powerful tools.",
    toolsSubtitle:
      "Everything you need to extract, convert, optimize and manage your images.",

    toolOcr: "Image to Text",
    toolOcrDesc:
      "Extract editable text from photos, screenshots and scanned documents.",
    toolPdf: "Image to PDF",
    toolPdfDesc:
      "Convert one or multiple images into a downloadable PDF document.",
    toolConverter: "Image Converter",
    toolConverterDesc:
      "Convert images between JPG, PNG and WEBP formats.",
    toolCompressor: "Image Compressor",
    toolCompressorDesc:
      "Reduce image file sizes while maintaining good visual quality.",
    toolMetadata: "Metadata Remover",
    toolMetadataDesc:
      "Remove embedded image metadata to help protect your privacy.",
    toolBackground: "Background Remover",
    toolBackgroundDesc:
      "Remove image backgrounds and create transparent PNG images.",

    available: "Available now",
    comingSoon: "Coming soon",
    openTool: "Open tool",

    featuresTitle: "Powerful tools. One workspace.",
    featuresSubtitle:
      "Simple features designed to make working with images easier.",

    feature1: "Text extraction",
    feature1Desc:
      "Extract printed text from photos, screenshots and scanned documents.",
    feature2: "English and French",
    feature2Desc:
      "Choose English, French or both for your text recognition.",
    feature3: "Fast processing",
    feature3Desc:
      "Process supported images directly in your browser.",
    feature4: "Image support",
    feature4Desc:
      "Work with popular image formats including PNG, JPG and WEBP.",
    feature5: "Copy and download",
    feature5Desc:
      "Download your processed images and copy extracted text.",
    feature6: "Extraction history",
    feature6Desc:
      "Save your OCR results and access them later from your account.",

    howTitle: "Three steps. That's it.",
    howSubtitle:
      "Start using SnapText AI without complicated software.",
    step1: "Create your account",
    step1Desc:
      "Sign up for free to access your personal workspace.",
    step2: "Choose your tool",
    step2Desc:
      "Select the image tool you need for your task.",
    step3: "Get your result",
    step3Desc:
      "Process your image and download or save the result.",

    pricingTitle: "Simple pricing",
    pricingSubtitle:
      "Start for free and upgrade when you need more.",
    monthly: "Free",
    pro: "Pro",
    proMonthly: "Pro Monthly",
    proYearly: "SnapText AI Pro Yearly",
    freePrice: "€0",
    perMonth: "/ month",
    perYear: "/ year",
    billedAnnually: "Billed annually",
    yearlyRenewal: "Recurring subscription. Renews every 12 months until canceled.",
    yearlySavings: "Save {amount} ({percent}%) per year versus monthly billing.",
    yearlyUnavailable: "Yearly checkout will be available after a Stripe Test Price ID is configured.",
    yearlyPriceInvalid: "The yearly price must be active, recurring, billed in EUR every 12 months, and cost €29.99.",
    subscriptionExists: "You already have a subscription. Manage it before starting another plan.",
    checkoutPending: "A checkout is already in progress. Finish or cancel it before selecting another plan.",
    yearlySetupRequired: "The yearly Stripe Test Price is not configured yet.",

    freeFeature1: "2 lifetime uses per tool",
    freeFeature2: "Access to all ten tools",
    freeFeature3: "No credit card required",

    proFeature1: "Unlimited use of all ten tools",
    proFeature2: "Unlimited processing across all tools",
    proFeature3: "OCR extraction history",
    proFeature4: "Manage your subscription and invoices",

    popular: "Most popular",
    choose: "Get started",
    upgrade: "Upgrade to Pro",
    redirecting: "Redirecting to Stripe...",

    checkoutError:
      "Unable to start checkout. Please try again.",

    ctaTitle: "Make working with images easier.",
    ctaDesc:
      "Join SnapText AI and access ten practical tools for your everyday image tasks.",

    footerDesc:
      "Your all-in-one workspace for image conversion, optimization and text extraction.",

    product: "Product",
    account: "Account",
    legal: "Information",
    privacy: "Privacy policy coming soon",
    terms: "Terms of service coming soon",
    rights: "All rights reserved.",

    dashboard: "Dashboard",
    history: "My history",

    uploadButton: "Open SnapText AI",
    uploadNote: "Create an account and start using our image tools.",

    pricingNote:
      "Free: 2 lifetime uses per tool. Pro offers monthly or yearly billing with unlimited usage.",
  },

  fr: {
    toolAnalyzer: "Analyseur intelligent de documents",
toolAnalyzerDesc: "Analysez vos documents et extrayez les informations clés grâce à l’IA.",

toolDescription: "Description d’image par IA",
toolDescriptionDesc: "Générez des descriptions claires et détaillées de vos images grâce à l’IA.",

toolReceipt: "Scanner de reçus et factures",
toolReceiptDesc: "Extrayez les commerçants, dates, totaux et lignes d’articles de vos reçus et factures.",


toolForm: "Extraction de formulaires et de données",
toolFormDesc: "Extrayez des données structurées à partir de formulaires et de documents.",
    navFeatures: "Fonctionnalités",
    navTools: "Nos outils",
    navHow: "Comment ça marche",
    navPricing: "Tarifs",
    login: "Connexion",
    signup: "Commencer",

    badge: "Votre boîte à outils tout-en-un pour les images",
    title: "Outils IA pour images et documents",
    titleAccent: "au quotidien.",
    subtitle:
      "Extrayez du texte, convertissez vos images en PDF, changez de format, compressez vos images et bien plus encore.",

    upload: "Découvrez nos outils d'image",
    uploadHint:
      "Créez votre compte gratuit et accédez aux dix outils depuis un seul espace.",
    formats: "JPG, PNG, WEBP",
    free: "2 utilisations gratuites à vie par outil",
    noCard: "Sans carte bancaire",

    toolsLabel: "NOS OUTILS IMAGE",
    toolsTitle: "Une plateforme. Dix outils puissants.",
    toolsSubtitle:
      "Tout pour extraire, convertir, optimiser et gérer vos images.",

    toolOcr: "Image en texte",
    toolOcrDesc:
      "Extrayez du texte modifiable depuis vos photos, captures d'écran et documents numérisés.",
    toolPdf: "Image en PDF",
    toolPdfDesc:
      "Convertissez une ou plusieurs images en document PDF téléchargeable.",
    toolConverter: "Convertisseur d'image",
    toolConverterDesc:
      "Convertissez vos images entre les formats JPG, PNG et WEBP.",
    toolCompressor: "Compresseur d'image",
    toolCompressorDesc:
      "Réduisez la taille de vos images tout en conservant une bonne qualité.",
    toolMetadata: "Suppression des métadonnées",
    toolMetadataDesc:
      "Supprimez les métadonnées intégrées à vos images pour protéger votre vie privée.",
    toolBackground: "Suppression d'arrière-plan",
    toolBackgroundDesc:
      "Supprimez l'arrière-plan de vos images et créez des PNG transparents.",

    available: "Disponible",
    comingSoon: "Bientôt disponible",
    openTool: "Ouvrir l'outil",

    featuresTitle: "Des outils puissants. Un seul espace.",
    featuresSubtitle:
      "Des fonctionnalités simples pour faciliter votre travail avec les images.",

    feature1: "Extraction de texte",
    feature1Desc:
      "Extrayez le texte imprimé de photos, captures d'écran et documents numérisés.",
    feature2: "Anglais et français",
    feature2Desc:
      "Choisissez l'anglais, le français ou les deux pour la reconnaissance.",
    feature3: "Traitement rapide",
    feature3Desc:
      "Traitez les images compatibles directement dans votre navigateur.",
    feature4: "Formats d'image",
    feature4Desc:
      "Travaillez avec les formats d'image courants comme PNG, JPG et WEBP.",
    feature5: "Copier et télécharger",
    feature5Desc:
      "Téléchargez vos images traitées et copiez le texte extrait.",
    feature6: "Historique des extractions",
    feature6Desc:
      "Enregistrez vos résultats OCR et retrouvez-les depuis votre compte.",

    howTitle: "Trois étapes. C'est tout.",
    howSubtitle:
      "Utilisez SnapText AI sans logiciel compliqué.",
    step1: "Créez votre compte",
    step1Desc:
      "Inscrivez-vous gratuitement pour accéder à votre espace personnel.",
    step2: "Choisissez votre outil",
    step2Desc:
      "Sélectionnez l'outil d'image adapté à votre besoin.",
    step3: "Récupérez votre résultat",
    step3Desc:
      "Traitez votre image puis téléchargez ou enregistrez le résultat.",

    pricingTitle: "Des tarifs simples",
    pricingSubtitle:
      "Commencez gratuitement et passez à Pro selon vos besoins.",
    monthly: "Gratuit",
    pro: "Pro",
    proMonthly: "Pro mensuel",
    proYearly: "SnapText AI Pro annuel",
    freePrice: "0 €",
    perMonth: "/ mois",
    perYear: "/ an",
    billedAnnually: "Facturation annuelle",
    yearlyRenewal: "Abonnement récurrent. Renouvellement tous les 12 mois jusqu’à résiliation.",
    yearlySavings: "Économisez {amount} ({percent} %) par an par rapport au tarif mensuel.",
    yearlyUnavailable: "Le paiement annuel sera disponible après la configuration d’un tarif Stripe de test.",
    yearlyPriceInvalid: "Le tarif annuel doit être actif, récurrent, facturé en euros tous les 12 mois et coûter 29,99 €.",
    subscriptionExists: "Vous avez déjà un abonnement. Gérez-le avant d’en commencer un autre.",
    checkoutPending: "Un paiement est déjà en cours. Terminez-le ou annulez-le avant de choisir une autre offre.",
    yearlySetupRequired: "Le tarif annuel Stripe de test n’est pas encore configuré.",

    freeFeature1: "2 utilisations gratuites à vie par outil",
    freeFeature2: "Accès aux dix outils",
    freeFeature3: "Sans carte bancaire",

    proFeature1: "Utilisation illimitée des dix outils",
    proFeature2: "Traitement illimité sur tous les outils",
    proFeature3: "Historique des extractions OCR",
    proFeature4: "Gestion de l'abonnement et des factures",

    popular: "Le plus populaire",
    choose: "Commencer",
    upgrade: "Passer à Pro",
    redirecting: "Redirection vers Stripe...",

    checkoutError:
      "Impossible de démarrer le paiement. Veuillez réessayer.",

    ctaTitle: "Simplifiez votre travail avec les images.",
    ctaDesc:
      "Rejoignez SnapText AI et profitez de dix outils pratiques pour vos tâches quotidiennes.",

    footerDesc:
      "Votre espace tout-en-un pour convertir, optimiser et extraire le texte de vos images.",

    product: "Produit",
    account: "Compte",
    legal: "Informations",
    privacy: "Politique de confidentialité bientôt disponible",
    terms: "Conditions d'utilisation bientôt disponibles",
    rights: "Tous droits réservés.",

    dashboard: "Tableau de bord",
    history: "Mon historique",

    uploadButton: "Ouvrir SnapText AI",
    uploadNote: "Créez un compte et commencez à utiliser nos outils image.",

    pricingNote:
      "Gratuit : 2 utilisations gratuites à vie par outil. Pro propose une facturation mensuelle ou annuelle avec une utilisation illimitée.",
  },
};

const toolIcons = [
  ScanText,
  FileImage,
  RefreshCw,
  Minimize2,
  LockKeyhole,
  Scissors,
  BrainCircuit,
  ImageIcon,
  ReceiptText,
  ClipboardList,
];

const featureIcons = [
  ScanText,
  Languages,
  Zap,
  ImageIcon,
  Download,
  History,
];

const howIcons = [
  ShieldCheck,
  UploadCloud,
  FileText,
];
type StripePriceSummary = {
  amountCents: number;
  currency: string;
  interval: "month" | "year";
};
type StripePricingSummary = {
  yearlyConfigured: boolean;
  monthly: StripePriceSummary | null;
  yearly: StripePriceSummary | null;
  savingsCents: number | null;
  savingsPercent: number | null;
};
export default function Home({ initialLanguage = "en" }: { initialLanguage?: Language }) {
  const router = useRouter();
  const [lang] = useState<Language>(initialLanguage);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<"monthly" | "yearly" | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutErrorPlan, setCheckoutErrorPlan] = useState<"monthly" | "yearly" | null>(null);
  const [stripePricing, setStripePricing] = useState<StripePricingSummary | null>(null);
  const [pricingLoaded, setPricingLoaded] = useState(false);
  const t = translations[lang];
  const dashboardHref = lang === "fr" ? "/fr/dashboard" : "/dashboard";

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/stripe/pricing")
      .then(async (response) => {
        if (!response.ok) throw new Error("Pricing unavailable");
        return response.json() as Promise<StripePricingSummary>;
      })
      .then((pricing) => {
        if (mounted) setStripePricing(pricing);
      })
      .catch(() => {
        if (mounted) setStripePricing(null);
      })
      .finally(() => {
        if (mounted) setPricingLoaded(true);
      });
    return () => { mounted = false; };
  }, []);

  const tools = [
    {
      title: t.toolOcr,
      description: t.toolOcrDesc,
      href: lang === "fr" ? "/fr/outils/image-to-text" : "/tools/image-to-text",
      category: "AI & Documents",
      available: true,
    },
    {
      title: t.toolPdf,
      description: t.toolPdfDesc,
      href: lang === "fr" ? "/fr/outils/image-to-pdf" : "/tools/image-to-pdf",
      category: "Document Conversion",
      available: true,
    },
    {
      title: t.toolConverter,
      description: t.toolConverterDesc,
      href: lang === "fr" ? "/fr/outils/image-converter" : "/tools/image-converter",
      category: "Image Conversion",
      available: true,
    },
    {
      title: t.toolCompressor,
      description: t.toolCompressorDesc,
      href: lang === "fr" ? "/fr/outils/image-compressor" : "/tools/image-compressor",
      category: "Image Optimization",
      available: true,
    },
    {
      title: t.toolMetadata,
      description: t.toolMetadataDesc,
      href: lang === "fr" ? "/fr/outils/metadata-remover" : "/tools/metadata-remover",
      category: "Privacy",
      available: true,
    },
    {
      title: t.toolBackground,
      description: t.toolBackgroundDesc,
      href: lang === "fr" ? "/fr/outils/background-remover" : "/tools/background-remover",
      category: "Image Editing",
      available: true,
    },
    {
  title: t.toolAnalyzer,
  description: t.toolAnalyzerDesc,
  href: lang === "fr" ? "/fr/outils/document-analyzer" : "/tools/document-analyzer",
  category: "AI & Documents",
  available: true,
},
{
  title: t.toolDescription,
  description: t.toolDescriptionDesc,
  href: lang === "fr" ? "/fr/outils/image-description" : "/tools/image-description",
  category: "AI & Images",
  available: true,
},
{
  title: t.toolReceipt,
  description: t.toolReceiptDesc,
  href: lang === "fr" ? "/fr/outils/receipt-scanner" : "/tools/receipt-scanner",
  category: "AI & Documents",
  available: true,
},

{
  title: t.toolForm,
  description: t.toolFormDesc,
  href: lang === "fr" ? "/fr/outils/form-extractor" : "/tools/form-extractor",
  category: "AI & Documents",
  available: true,
},
  ];

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

  const formatEuro = (amountCents: number) =>
    new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-IE", {
      style: "currency",
      currency: "EUR",
    }).format(amountCents / 100);
  const savingsAmount = stripePricing?.savingsCents;
  const savingsPercent = stripePricing?.savingsPercent;
  const yearlySavingsText = savingsAmount && savingsPercent
    ? t.yearlySavings
        .replace("{amount}", formatEuro(savingsAmount))
        .replace("{percent}", savingsPercent.toLocaleString(lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 1 }))
    : null;

  const plans = [
    {
      name: t.monthly,
      price: t.freePrice,
      pricePeriod: "",
      billingDescription: "",
      renewalText: "",
      savingsText: null,
      features: [
        t.freeFeature1,
        t.freeFeature2,
        t.freeFeature3,
      ],
      popular: false,
      planType: "free" as const,
    },
    {
      name: t.proMonthly,
      price: formatEuro(stripePricing?.monthly?.amountCents ?? 499),
      pricePeriod: t.perMonth,
      billingDescription: "",
      renewalText: "",
      savingsText: null,
      features: [
        t.proFeature1,
        t.proFeature2,
        t.proFeature3,
        t.proFeature4,
      ],
      popular: true,
      planType: "monthly" as const,
    },
    {
      name: t.proYearly,
      price: formatEuro(stripePricing?.yearly?.amountCents ?? 2999),
      pricePeriod: t.perYear,
      billingDescription: t.billedAnnually,
      renewalText: t.yearlyRenewal,
      savingsText: yearlySavingsText,
      features: [
        t.proFeature1,
        t.proFeature2,
        t.proFeature3,
        t.proFeature4,
      ],
      popular: false,
      planType: "yearly" as const,
    },
  ];
const [user, setUser] = useState<User | null>(null);
const [authLoading, setAuthLoading] = useState(true);
const [toolSearch, setToolSearch] = useState("");
const [toolCategory, setToolCategory] = useState("All tools");

useEffect(() => {
  const supabase = createClient();
  let mounted = true;

  async function loadUser() {
    const { data, error } = await supabase.auth.getUser();

    if (mounted) {
      setUser(error ? null : data.user);
      setAuthLoading(false);
    }
  }

  loadUser();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (mounted) {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    }
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);
  function closeMobileMenu() {
    setMobileOpen(false);
  }

  async function handleProCheckout(plan: "monthly" | "yearly") {
    if (checkoutLoadingPlan) return;

    try {
      setCheckoutLoadingPlan(plan);
      setCheckoutError("");
      setCheckoutErrorPlan(plan);

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, locale: lang }),
      });

      if (response.status === 401) {
        router.push("/login?next=%2F");
        return;
      }

      const data = await response.json();

      if (data.code === "SUBSCRIPTION_EXISTS") {
        setCheckoutError(t.subscriptionExists);
        return;
      }
      if (data.code === "CHECKOUT_IN_PROGRESS") {
        setCheckoutError(t.checkoutPending);
        return;
      }
      if (data.code === "PRICE_NOT_CONFIGURED") {
        setCheckoutError(t.yearlySetupRequired);
        return;
      }
      if (data.code === "PRICE_INVALID" && plan === "yearly") {
        setCheckoutError(t.yearlyPriceInvalid);
        return;
      }
      if (!response.ok || !data.url) {
        throw new Error(
          data.error || "Unable to start checkout."
        );
      }

      window.location.assign(data.url);
    } catch (error) {
      console.error("Checkout error:", error);
      setCheckoutError(t.checkoutError);
    } finally {
      setCheckoutLoadingPlan(null);
    }
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

          <nav aria-label={lang === "fr" ? "Navigation principale" : "Main navigation"} className="hidden items-center gap-7 md:flex">
            <a href="#tools" className="text-sm font-medium text-slate-600 hover:text-violet-600">
              {t.navTools}
            </a>

            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-violet-600">
              {t.navFeatures}
            </a>

            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-violet-600">
              {t.navHow}
            </a>

            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-violet-600">
              {t.navPricing}
            </a>
          </nav>
          <div className="relative hidden lg:block">
            <input aria-label="Search tools" value={toolSearch} onChange={(event) => setToolSearch(event.target.value)} placeholder={lang === "fr" ? "Rechercher un outil…" : "Search tools…"} className="w-44 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:w-56 focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100" />
            {toolSearch.trim() && <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">{tools.filter((tool) => `${tool.title} ${tool.description}`.toLowerCase().includes(toolSearch.toLowerCase())).slice(0, 6).map((tool) => <Link key={tool.title} href={tool.href} onClick={() => setToolSearch("")} className="block rounded-lg px-3 py-2 text-sm hover:bg-violet-50"><span className="font-semibold text-slate-800">{tool.title}</span><span className="mt-0.5 block line-clamp-1 text-xs text-slate-500">{tool.description}</span></Link>)}{tools.every((tool) => !`${tool.title} ${tool.description}`.toLowerCase().includes(toolSearch.toLowerCase())) && <p className="px-3 py-2 text-sm text-slate-500">No matching tools found.</p>}</div>}
          </div>

          <div className="hidden items-center gap-3 md:flex">

           {!authLoading && !user && (
  <>
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
  </>
)}

{!authLoading && user && (
  <Link href={dashboardHref} className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700">
    {t.dashboard}
  </Link>
)}

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
            <nav aria-label={lang === "fr" ? "Navigation mobile" : "Mobile navigation"} className="flex flex-col gap-5">
              <a href="#tools" onClick={closeMobileMenu}>
                {t.navTools}
              </a>

              <a href="#features" onClick={closeMobileMenu}>
                {t.navFeatures}
              </a>

              <a href="#how-it-works" onClick={closeMobileMenu}>
                {t.navHow}
              </a>

              <a href="#pricing" onClick={closeMobileMenu}>
                {t.navPricing}
              </a>


             {!authLoading && !user && (
  <>
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
  </>
)}

{!authLoading && user && (
  <Link href={dashboardHref} onClick={closeMobileMenu} className="rounded-lg bg-violet-600 py-3 text-center font-semibold text-white">
    {t.dashboard}
  </Link>
)}

</nav>
          </div>
        )}
      </header>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-violet-50/80 via-white to-white px-5 pb-24 pt-20 lg:pt-28">
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

          <div className="mx-auto mt-12 max-w-2xl">
            <div className="rounded-3xl border-2 border-dashed border-violet-300 bg-white p-8 shadow-xl shadow-violet-100/60 sm:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <UploadCloud size={32} />
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-900">
                {t.upload}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {t.uploadHint}
              </p>

              <p className="mt-3 text-xs text-slate-400">
                {t.formats}
              </p>

           <Link
  href={user ? dashboardHref : "/signup"}
  aria-label={user ? (lang === "fr" ? "Ouvrir le tableau de bord" : "Open dashboard") : (lang === "fr" ? "Créer un compte SnapText AI" : "Create a SnapText AI account")}
  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
>
  <ImageIcon size={18} />
  {user ? t.dashboard : t.uploadButton}
  <ArrowRight size={17} />
</Link>

              <p className="mt-4 text-xs text-slate-400">
                {t.uploadNote}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TOOLS */}
      <section
        id="tools"
        className="scroll-mt-24 bg-slate-50 px-5 py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-violet-600">
              {t.toolsLabel}
            </span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              {t.toolsTitle}
            </h2>

            <p className="mt-4 leading-7 text-slate-500">
              {t.toolsSubtitle}
            </p>
          </div>

     <div className="mb-8 flex flex-wrap justify-center gap-2">
  {["All tools", "AI & Documents", "AI & Images", "Image Editing", "Image Optimization", "Image Conversion", "Document Conversion", "Privacy"].map((category) => <button key={category} type="button" onClick={() => setToolCategory(category)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${toolCategory === category ? "bg-violet-600 text-white shadow-md shadow-violet-200" : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"}`}>{lang === "fr" ? ({"All tools":"Tous les outils", "AI & Documents":"IA et documents", "AI & Images":"IA et images", "Image Editing":"Édition d’image", "Image Optimization":"Optimisation d’image", "Image Conversion":"Conversion d’image", "Document Conversion":"Conversion de documents", "Privacy":"Confidentialité"} as Record<string,string>)[category] : category}</button>)}
</div>
     <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
  {tools.filter((tool) => toolCategory === "All tools" || tool.category === toolCategory).map((tool) => {
    const index = tools.indexOf(tool);
    const Icon = toolIcons[index];

    return (
      <div
        key={tool.title}
        className="group rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-100/50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition group-hover:bg-violet-100">
            <Icon size={24} />
          </div>

          {tool.available ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              {t.available}
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              {t.comingSoon}
            </span>
          )}
        </div>

        <h3 className="mt-6 text-lg font-bold text-slate-900">
          {tool.title}
        </h3>

        <p className="mt-3 min-h-[72px] text-sm leading-7 text-slate-500">
          {tool.description}
        </p>

        {tool.available ? (
          <Link
            href={tool.href}
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-violet-600 transition hover:text-violet-800"
          >
            {t.openTool}
            <ArrowRight size={16} />
          </Link>
        ) : (
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-400">
            {t.comingSoon}
          </span>
        )}
      </div>
    );
  })}
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
              {t.navFeatures}
            </span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              {t.featuresTitle}
            </h2>

            <p className="mt-4 leading-7 text-slate-500">
              {t.featuresSubtitle}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, desc], index) => {
              const Icon = featureIcons[index];

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
              {t.navHow}
            </span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              {t.howTitle}
            </h2>

            <p className="mt-4 text-slate-500">
              {t.howSubtitle}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map(([title, desc], index) => {
              const Icon = howIcons[index];

              return (
                <div
                  key={title}
                  className="rounded-2xl bg-white p-8 text-center shadow-sm"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                    <Icon size={30} />
                  </div>

                  <div className="mx-auto mt-5 flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                    {index + 1}
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
              {t.navPricing}
            </span>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              {t.pricingTitle}
            </h2>

            <p className="mt-4 text-slate-500">
              {t.pricingSubtitle}
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.planType}
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

                  <span className="text-sm text-slate-500">
                    {plan.pricePeriod}
                  </span>
                </div>

                {plan.billingDescription && (
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    {plan.billingDescription}
                  </p>
                )}
                {plan.renewalText && (
                  <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">
                    {plan.renewalText}
                  </p>
                )}

                {plan.planType === "yearly" && (
                  <p className="mt-2 min-h-5 text-sm font-semibold text-emerald-700">
                    {plan.savingsText ?? (pricingLoaded && stripePricing?.yearlyConfigured === false ? t.yearlyUnavailable : "")}
                  </p>
                )}

                {plan.planType !== "free" ? (
                  <button
                    type="button"
                    onClick={() => void handleProCheckout(plan.planType)}
                    disabled={checkoutLoadingPlan !== null || (plan.planType === "yearly" && pricingLoaded && stripePricing?.yearlyConfigured === false)}
                    className="mt-7 block w-full rounded-xl bg-violet-600 py-3 text-center text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {checkoutLoadingPlan === plan.planType ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {t.redirecting}
                      </span>
                    ) : (
                      t.upgrade
                    )}
                  </button>
                ) : (
                  <Link
                    href="/signup"
                    className="mt-7 block w-full rounded-xl bg-slate-900 py-3 text-center text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    {t.choose}
                  </Link>
                )}

                {checkoutError && checkoutErrorPlan === plan.planType && (
                  <p className="mt-3 text-center text-sm text-red-600" role="alert">
                    {checkoutError}
                  </p>
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

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([
        {
          "@context": "https://schema.org", "@type": "SoftwareApplication",
          name: "SnapText AI", applicationCategory: "UtilitiesApplication", operatingSystem: "Web",
          description: "AI-powered image and document tools to extract text, analyze documents, scan receipts and optimize images.",
          offers: [
            { "@type": "Offer", name: "Free", price: "0", priceCurrency: "EUR", description: "Two lifetime uses per tool." },
            { "@type": "Offer", name: "Pro", price: "4.99", priceCurrency: "EUR", description: "Unlimited use of all ten tools.", priceSpecification: { "@type": "UnitPriceSpecification", price: "4.99", priceCurrency: "EUR", unitCode: "MON" } }
          ]
        },
        {
          "@context": "https://schema.org", "@type": "Product", name: "SnapText AI",
          description: "An online collection of AI image and document processing tools.",
          brand: { "@type": "Brand", name: "SnapText AI" },
          offers: [
            { "@type": "Offer", name: "Free", price: "0", priceCurrency: "EUR" },
            { "@type": "Offer", name: "Pro", price: "4.99", priceCurrency: "EUR", priceSpecification: { "@type": "UnitPriceSpecification", price: "4.99", priceCurrency: "EUR", unitCode: "MON" } }
          ]
        }
      ]).replace(/</g, "\\u003c") }} />

      {/* FAQ — visible content and matching structured data */}
      <section id="faq" className="bg-slate-50 px-5 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-violet-600">FAQ</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              {lang === "fr" ? "Questions fréquentes sur SnapText AI" : "Frequently asked questions about SnapText AI"}
            </h2>
          </div>
          <div className="space-y-4">
            {(lang === "fr" ? [
              { q: "Que puis-je faire avec SnapText AI ?", a: "SnapText AI réunit dix outils en ligne pour travailler avec les images et les documents. Vous pouvez extraire du texte depuis une image, analyser des documents, scanner des reçus, retirer un arrière-plan, compresser ou convertir des images et créer des PDF. Les outils disponibles dépendent de votre espace de travail." },
              { q: "SnapText AI propose-t-il une formule gratuite ?", a: "Oui. Le compte gratuit donne accès aux dix outils avec deux utilisations à vie par outil, sans carte bancaire. Si vous avez besoin de traitements supplémentaires, l’offre Pro coûte 4,99 € par mois et permet une utilisation illimitée des outils inclus." },
              { q: "Quels formats d’image sont pris en charge ?", a: "Les outils image prennent en charge les formats courants JPG, PNG et WEBP lorsque cela s’applique au traitement choisi. Les formats d’entrée et de sortie peuvent varier selon l’outil. Consultez les indications affichées dans l’espace de travail avant d’importer votre fichier." },
            ] : [
              { q: "What can I do with SnapText AI?", a: "SnapText AI brings ten online tools together for working with images and documents. You can extract text from images, analyze documents, scan receipts, remove image backgrounds, compress or convert images, and create PDFs. Available workflows depend on the tool you choose in your workspace." },
              { q: "Does SnapText AI have a free plan?", a: "Yes. A free account provides access to all ten tools with two lifetime uses per tool and no credit card required. If you need additional processing, the Pro plan costs €4.99 per month and provides unlimited use of the included tools." },
              { q: "Which image formats are supported?", a: "Image workflows support common formats such as JPG, PNG and WEBP where applicable. Input and output formats can vary depending on the selected tool and its processing requirements. Check the upload guidance in the workspace before submitting a file to confirm the supported formats." },
            ]).map((faq) => (
              <article key={faq.q} className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold text-slate-900">{faq.q}</h3>
                <p className="mt-3 leading-7 text-slate-600">{faq.a}</p>
              </article>
            ))}
          </div>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org", "@type": "FAQPage",
          mainEntity: (lang === "fr" ? [
            { q: "Que puis-je faire avec SnapText AI ?", a: "SnapText AI réunit dix outils en ligne pour travailler avec les images et les documents. Vous pouvez extraire du texte depuis une image, analyser des documents, scanner des reçus, retirer un arrière-plan, compresser ou convertir des images et créer des PDF. Les outils disponibles dépendent de votre espace de travail." },
            { q: "SnapText AI propose-t-il une formule gratuite ?", a: "Oui. Le compte gratuit donne accès aux dix outils avec deux utilisations à vie par outil, sans carte bancaire. Si vous avez besoin de traitements supplémentaires, l’offre Pro coûte 4,99 € par mois et permet une utilisation illimitée des outils inclus." },
            { q: "Quels formats d’image sont pris en charge ?", a: "Les outils image prennent en charge les formats courants JPG, PNG et WEBP lorsque cela s’applique au traitement choisi. Les formats d’entrée et de sortie peuvent varier selon l’outil. Consultez les indications affichées dans l’espace de travail avant d’importer votre fichier." },
          ] : [
            { q: "What can I do with SnapText AI?", a: "SnapText AI brings ten online tools together for working with images and documents. You can extract text from images, analyze documents, scan receipts, remove image backgrounds, compress or convert images, and create PDFs. Available workflows depend on the tool you choose in your workspace." },
            { q: "Does SnapText AI have a free plan?", a: "Yes. A free account provides access to all ten tools with two lifetime uses per tool and no credit card required. If you need additional processing, the Pro plan costs €4.99 per month and provides unlimited use of the included tools." },
            { q: "Which image formats are supported?", a: "Image workflows support common formats such as JPG, PNG and WEBP where applicable. Input and output formats can vary depending on the selected tool and its processing requirements. Check the upload guidance in the workspace before submitting a file to confirm the supported formats." },
          ]).map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } }))
        }).replace(/</g, "\\u003c") }} />
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
            href={user ? dashboardHref : "/signup"}
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
              <h2 className="font-bold text-slate-900">
                {t.product}
              </h2>

              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500">
                <a href="#tools" className="hover:text-violet-600">
                  {t.navTools}
                </a>

                <a href="#features" className="hover:text-violet-600">
                  {t.navFeatures}
                </a>

                <a href="#pricing" className="hover:text-violet-600">
                  {t.navPricing}
                </a>
              </div>
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                {t.account}
              </h2>

              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500">
               {!user && (
  <>
    <Link href="/signup" className="hover:text-violet-600">
      {t.signup}
    </Link>

    <Link href="/login" className="hover:text-violet-600">
      {t.login}
    </Link>
  </>
)}

<Link href={dashboardHref} className="hover:text-violet-600">
  {t.dashboard}
</Link>

<Link
  href={lang === "fr" ? "/fr/dashboard/history" : "/dashboard/history"}
  className="hover:text-violet-600"
>
  {t.history}
</Link>

              
              </div>
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                {t.legal}
              </h2>

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
