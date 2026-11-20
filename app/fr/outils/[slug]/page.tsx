import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/seo";

export const instant = false;

type Tool = {
  name: string;
  title: string;
  description: string;
  category: string;
  details: string;
  workspace: string;
  keyword: string;
  benefits: string[];
  faqs: { question: string; answer: string }[];
};

const commonFaqs = (toolName: string, action: string) => [
  {
    question: `Comment utiliser ${toolName.toLowerCase()} ?`,
    answer: `Ouvrez la page ${toolName.toLowerCase()}, accédez à l’outil dans votre espace SnapText AI, puis importez un fichier compatible. Vérifiez le résultat avant de le télécharger ou de l’enregistrer. Les options de traitement et les formats acceptés peuvent varier selon l’outil et le type de fichier utilisé.`,
  },
  {
    question: `Puis-je essayer ${toolName.toLowerCase()} gratuitement ?`,
    answer: `Oui. Un compte SnapText AI gratuit comprend deux utilisations à vie pour chacun des dix outils. Vous pouvez essayer ${action} sans saisir vos coordonnées bancaires. Les tarifs et périodes de facturation payants sont affichés dans la section des offres et confirmés dans Stripe Checkout avant le paiement. Les abonnements se renouvellent à la période indiquée jusqu’à leur résiliation.`,
  },
  {
    question: `Quels formats de fichiers cet outil accepte-t-il ?`,
    answer: `Les formats compatibles dépendent de la fonctionnalité choisie. Les outils dédiés aux images prennent en charge des formats courants comme JPG, PNG et WEBP lorsque cela est pertinent. Consultez les indications affichées dans la zone d’importation avant d’envoyer un fichier, car les formats d’entrée et de sortie peuvent différer.`,
  },
];

const tools: Record<string, Tool> = {
  "image-to-text": {
    name: "Image en texte (OCR)", title: "Convertir une image en texte en ligne",
    description: "Extrayez le texte d’une image en ligne grâce à l’OCR par IA. Convertissez photos, captures d’écran et documents numérisés en texte modifiable avec SnapText AI.",
    category: "IA et reconnaissance de texte", details: "Importez une image JPG, PNG ou WebP pour convertir le texte visible en contenu modifiable. L’espace OCR prend en charge la reconnaissance de textes en français et en anglais.",
    workspace: "/fr/dashboard/image-to-text", keyword: "convertir image en texte",
    benefits: ["Extraire le texte imprimé des photos et captures d’écran", "Convertir des pages numérisées en texte modifiable", "Copier ou enregistrer les résultats de reconnaissance OCR"],
    faqs: commonFaqs("l’outil de conversion d’image en texte", "la conversion d’image en texte"),
  },
  "document-analyzer": {
    name: "Analyseur intelligent de documents", title: "Analyser un document avec l’IA",
    description: "Analysez vos documents avec l’IA pour repérer les informations clés, résumés, dates et actions à mener. Comprenez vos fichiers plus rapidement avec SnapText AI.",
    category: "IA et documents", details: "Facilitez la lecture de vos documents grâce à l’identification de leur structure, des résumés, des dates importantes, des entités et des actions à retenir.",
    workspace: "/fr/dashboard/document-analyzer", keyword: "analyseur de documents IA",
    benefits: ["Analyser le contenu de documents avec l’IA", "Repérer les informations et dates importantes", "Faciliter la compréhension de documents volumineux"],
    faqs: commonFaqs("l’analyseur de documents IA", "l’analyse de documents"),
  },
  "form-extractor": {
    name: "Extracteur de formulaires et de données", title: "Extraire les données d’un formulaire avec l’IA",
    description: "Extrayez les données structurées de formulaires et de documents avec l’IA. Organisez les champs importants et réduisez la saisie manuelle avec SnapText AI.",
    category: "IA et documents", details: "Transformez les champs présents dans vos documents en informations structurées et plus faciles à réutiliser dans vos processus.",
    workspace: "/fr/dashboard/form-extractor", keyword: "extraction de données de formulaire IA",
    benefits: ["Extraire les champs de formulaires et de documents", "Organiser les informations en données structurées", "Réduire les tâches répétitives de saisie manuelle"],
    faqs: commonFaqs("l’extracteur de formulaires et de données", "l’extraction de formulaires et de données"),
  },
  "receipt-scanner": {
    name: "Scanner de reçus et de factures", title: "Scanner des reçus et factures avec l’IA",
    description: "Scannez vos reçus et factures en ligne avec l’IA. Extrayez les commerçants, dates, montants et lignes de facture avec SnapText AI.",
    category: "IA et documents", details: "Numérisez les reçus et les factures pour retrouver et examiner plus facilement les principales informations de transaction.",
    workspace: "/fr/dashboard/receipt-scanner", keyword: "scanner de reçus IA",
    benefits: ["Lire les coordonnées du commerçant et les dates", "Extraire les montants totaux et les lignes détaillées", "Consulter les informations des reçus et factures"],
    faqs: commonFaqs("le scanner de reçus et de factures", "la numérisation de reçus et de factures"),
  },
  "image-description": {
    name: "Description d’image par IA", title: "Générateur de description d’image par IA",
    description: "Générez des descriptions d’images claires avec l’IA. Comprenez le contenu visuel et transformez vos photos en descriptions textuelles avec SnapText AI.",
    category: "IA et images", details: "Créez des descriptions utiles du contenu visuel à partir des images que vous importez, grâce à la compréhension d’image par intelligence artificielle.",
    workspace: "/fr/dashboard/image-description", keyword: "générateur de description d’image IA",
    benefits: ["Générer des descriptions en langage naturel", "Résumer les éléments visibles d’une image", "Créer du texte descriptif à partir de vos images"],
    faqs: commonFaqs("le générateur de description d’image", "la génération de descriptions d’images"),
  },
  "background-remover": {
    name: "Suppression de l’arrière-plan", title: "Supprimer l’arrière-plan d’une image en ligne",
    description: "Supprimez l’arrière-plan d’une image en ligne et créez des images PNG transparentes. Préparez vos photos de produits et visuels avec SnapText AI.",
    category: "Retouche d’image", details: "Créez des images avec un arrière-plan transparent à partir de fichiers compatibles importés dans SnapText AI.",
    workspace: "/fr/dashboard/background-remover", keyword: "supprimer arrière-plan image",
    benefits: ["Supprimer l’arrière-plan des images compatibles", "Créer des fichiers PNG avec transparence", "Préparer des visuels pour le design et les fiches produits"],
    faqs: commonFaqs("l’outil de suppression d’arrière-plan", "la suppression d’arrière-plan"),
  },
  "image-compressor": {
    name: "Compresseur d’images", title: "Compresser une image en ligne",
    description: "Compressez vos images en ligne pour réduire la taille des fichiers JPG, PNG et WEBP tout en préservant leur qualité visuelle. Optimisez vos images avec SnapText AI.",
    category: "Optimisation d’image", details: "Réduisez la taille de vos images et téléchargez des fichiers optimisés directement depuis l’espace de travail SnapText AI.",
    workspace: "/fr/dashboard/image-compressor", keyword: "compresser image en ligne",
    benefits: ["Réduire la taille des fichiers image", "Optimiser les formats d’image courants", "Télécharger les images compressées"],
    faqs: commonFaqs("le compresseur d’images", "la compression d’images"),
  },
  "image-converter": {
    name: "Convertisseur d’images", title: "Convertir une image en ligne",
    description: "Convertissez vos images en ligne entre les formats JPG, PNG et WEBP. Choisissez le format de sortie adapté et téléchargez vos fichiers avec SnapText AI.",
    category: "Conversion d’image", details: "Convertissez les formats d’image courants en choisissant le format de sortie adapté à votre utilisation.",
    workspace: "/fr/dashboard/image-converter", keyword: "convertisseur d’images en ligne",
    benefits: ["Convertir des images JPG, PNG et WEBP", "Choisir un format de sortie adapté", "Télécharger les fichiers convertis"],
    faqs: commonFaqs("le convertisseur d’images", "la conversion d’images"),
  },
  "image-to-pdf": {
    name: "Image en PDF", title: "Convertir une image en PDF en ligne",
    description: "Convertissez une ou plusieurs images en PDF téléchargeable en ligne. Regroupez vos fichiers image dans un document avec le convertisseur SnapText AI.",
    category: "Conversion de documents", details: "Organisez vos images et exportez-les dans un document PDF facile à télécharger et à partager.",
    workspace: "/fr/dashboard/image-to-pdf", keyword: "convertir image en PDF",
    benefits: ["Convertir des images en document PDF", "Regrouper plusieurs images dans un seul PDF", "Télécharger un fichier PDF facile à partager"],
    faqs: commonFaqs("le convertisseur d’image en PDF", "la conversion d’image en PDF"),
  },
  "metadata-remover": {
    name: "Suppression des métadonnées d’image", title: "Supprimer les métadonnées d’une image en ligne",
    description: "Supprimez les métadonnées intégrées à vos images avant de partager vos photos. Exportez des fichiers image sans leurs métadonnées avec SnapText AI.",
    category: "Confidentialité", details: "Exportez une image nettoyée de ses métadonnées intégrées d’origine avant de la partager.",
    workspace: "/fr/dashboard/metadata-remover", keyword: "supprimer métadonnées image",
    benefits: ["Supprimer les métadonnées intégrées aux images", "Préparer les photos avant leur partage", "Créer une image exportée sans métadonnées d’origine"],
    faqs: commonFaqs("l’outil de suppression des métadonnées", "la suppression des métadonnées d’image"),
  },
};

export function generateStaticParams() {
  return Object.keys(tools).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = tools[slug];
  if (!tool) return { title: "Outil introuvable", robots: { index: false, follow: false } };
  const canonical = absoluteUrl(`/fr/outils/${slug}`);
  const englishUrl = absoluteUrl(`/tools/${slug}`);
  return {
    title: tool.title,
    description: tool.description,
    alternates: { canonical, languages: { en: englishUrl, fr: canonical } },
    openGraph: { title: tool.title, description: tool.description, url: canonical, type: "website", locale: "fr_FR", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${tool.name} par SnapText AI` }] },
    twitter: { card: "summary_large_image", title: tool.title, description: tool.description, images: ["/twitter-image"] },
  };
}

export default async function FrenchToolLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = tools[slug];
  if (!tool) notFound();

  await connection();
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getClaims();
  const isSignedIn = !authError && Boolean(authData?.claims);

  async function handleLogout() {
    "use server";

    const client = await createClient();
    await client.auth.signOut();
    redirect("/fr");
  }

  const pageUrl = absoluteUrl(`/fr/outils/${slug}`);
  // Les offres SnapText AI sont des abonnements logiciels numériques,
  // et non des produits physiques. Elles restent donc liées à SoftwareApplication.
  // Ne pas ajouter de données d'expédition fictives ni de balisage Product ici.
  const offers = [
    {
      "@type": "Offer",
      name: "Gratuit",
      price: "0",
      priceCurrency: "EUR",
      description: "Deux utilisations à vie par outil.",
      availability: "https://schema.org/OnlineOnly",
    },
    {
      "@type": "Offer",
      name: "Pro mensuel",
      price: "2.99",
      priceCurrency: "EUR",
      description: "Accès illimité à tous les outils SnapText AI, facturé mensuellement.",
      availability: "https://schema.org/OnlineOnly",
    },
    {
      "@type": "Offer",
      name: "Pro annuel",
      price: "29.99",
      priceCurrency: "EUR",
      description: "Accès illimité à tous les outils SnapText AI, facturé annuellement.",
      availability: "https://schema.org/OnlineOnly",
    },
  ];

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: tool.name,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      inLanguage: "fr",
      description: tool.description,
      url: pageUrl,
      offers,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: "fr",
      mainEntity: tool.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];

  return (
    <main lang="fr" className="min-h-screen bg-slate-950 text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/fr" aria-label="Accueil SnapText AI" className="text-xl font-bold">SnapText <span className="text-violet-400">AI</span></Link>
          <nav aria-label="Navigation principale" className="flex items-center gap-5 text-sm">
            <Link href="/fr#tools" className="text-slate-300 hover:text-white">Tous les outils</Link>
            <Link href={`/tools/${slug}`} hrefLang="en" lang="en" className="text-slate-300 hover:text-white">English</Link>
            {isSignedIn ? (
              <>
                <Link href="/fr/dashboard" className="text-slate-300 hover:text-white">Tableau de bord</Link>
                <form action={handleLogout}>
                  <button type="submit" aria-label="Se déconnecter de SnapText AI" className="text-slate-300 hover:text-white">Déconnexion</button>
                </form>
              </>
            ) : (
              <Link href="/login" className="text-slate-300 hover:text-white">Connexion</Link>
            )}
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-violet-300">{tool.category}</p>
        <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">{tool.title}</h1>
        <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-slate-300">{tool.description}</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={tool.workspace} aria-label={`Ouvrir ${tool.name}`} className="rounded-xl bg-violet-600 px-7 py-3.5 font-semibold text-white hover:bg-violet-700">Utiliser cet outil</Link>
          <Link href="/fr#pricing" className="rounded-xl border border-white/20 px-7 py-3.5 font-semibold hover:bg-white/5">Voir les tarifs</Link>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <h2 className="text-2xl font-semibold">Que faire avec {tool.name.toLowerCase()} ?</h2>
          <p className="mt-4 leading-7 text-slate-300">{tool.details}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {tool.benefits.map((benefit) => <li key={benefit} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-slate-200">{benefit}</li>)}
          </ul>
          <p className="mt-7 text-sm text-slate-400">Un compte gratuit comprend deux utilisations à vie de chaque outil. Passez à l’offre Pro pour bénéficier d’un accès illimité à SnapText AI.</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="text-2xl font-semibold">Questions fréquentes</h2>
        <div className="mt-6 grid gap-4">
          {tool.faqs.map((faq) => <article key={faq.question} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"><h3 className="font-semibold">{faq.question}</h3><p className="mt-3 leading-7 text-slate-300">{faq.answer}</p></article>)}
        </div>
      </section>
    </main>
  );
}
