import type { LegalSection } from "@/components/legal-page";

export type LegalDocument = {
  title: string;
  intro: string;
  sections: LegalSection[];
  contactForm?: boolean;
};

const correspondence = "29 Rue Traversière, 75012 Paris, France";
const email = "ishakdev99@gmail.com";
const phone = "+33 7 53 18 79 15";

const documents: Record<"en" | "fr", Record<string, LegalDocument>> = {
  en: {
    contact: {
      title: "Contact and data requests",
      intro: "Contact SnapTextAI about the service, your account, or a privacy request.",
      contactForm: true,
      sections: [
        { title: "Support", body: [`Email ${email} or use the contact form below. Correspondence address: ${correspondence}. Telephone: ${phone}. The address is the owner's domicile used for business correspondence; it is not represented here as business premises.`] },
        { title: "Privacy requests", body: [`Use ${email} for access, correction, deletion, restriction, objection, or portability requests. Signed-in users can also export available account data and request account deletion from the dashboard. Do not include passwords or payment-card details in a support request. In France, you may contact the CNIL if you believe your data-protection rights have not been respected.`] },
      ],
    },
    "legal-notice": {
      title: "Legal notice",
      intro: "Publisher and contact information for SnapTextAI.",
      sections: [
        { title: "Publisher", body: [`Public brand: SnapTextAI. The service is operated by an individual business operator under this brand. Business correspondence address: ${correspondence}. This is the operator's domicile for correspondence and is not stated to be a registered business premises. Contact: ${email}; telephone: ${phone}.`] },
        { title: "Hosting and service providers", body: ["The website is hosted on Vercel. Authentication, database, and file storage are provided through Supabase. Stripe handles subscription checkout and billing. Cloudflare and Remove.bg process files when the corresponding image or document tools are used."] },
      ],
    },
    privacy: {
      title: "Privacy policy",
      intro: "This policy explains the personal information used to provide SnapTextAI and how to exercise your privacy rights.",
      sections: [
        { title: "Who operates the service", body: [`SnapTextAI is the public brand used by an individual business operator. The business correspondence address is ${correspondence}. Privacy and support contact: ${email}; telephone: ${phone}. The address is used for correspondence and is not represented as business premises.`] },
        { title: "Information and purposes", body: ["Supabase Auth processes account email and sign-in/session information. The application may store tool history, file names, generated text, language, and related metadata in your account. Usage events enforce free and paid feature limits. Stripe processes payment details and sends subscription identifiers and status to SnapTextAI; card details are handled by Stripe.", "When you use a file or image tool, the file may be stored temporarily in Supabase Storage and processed by the provider required for that tool, including Cloudflare or Remove.bg. Contact-form messages are sent to the support inbox through the configured email-delivery provider. Google Tag Manager and GA4 load only after you allow analytics in cookie settings; analytics events do not include account IDs, email addresses, uploaded content, or payment details." ] },
        { title: "Retention and account controls", body: ["The application is configured to remove uploaded objects after seven days when the production scheduled job and its secret are configured and running. Saved text and history metadata are retained until you remove them or delete your account, except where a longer period is required for security, backups, or legal obligations. Stripe retains billing records under its own policies and applicable law.", "You can update account email and display name in Account settings, export data available to your account, or request deletion from the dashboard. Account deletion cancels any Stripe subscription before removing account data. Contact support for privacy questions or a request that is not available in the dashboard."] },
        { title: "Providers and your rights", body: ["The service uses Vercel for hosting, Supabase for authentication, database and storage, Stripe for payments, Cloudflare and Remove.bg for selected file processing, and an email-delivery provider for contact messages. These providers process information under their own service terms. Optional analytics is off until consent is granted; you can change your choice at any time using Cookie Settings.", `For privacy requests, contact ${email}. You may also lodge a complaint with the CNIL in France.`] },
      ],
    },
    terms: {
      title: "Terms of service",
      intro: "These terms govern access to the SnapTextAI website and tools.",
      sections: [
        { title: "Service and accounts", body: ["SnapTextAI provides online image and document tools, including OCR, file conversion, compression, metadata removal, and AI-assisted analysis. An account is required for dashboard features and saved history. Keep your credentials secure and provide accurate account information.", "You must have the rights and authority to upload each file and permit the processing needed for the tool you choose. Do not upload unlawful content, infringe another person's rights, attempt to compromise the service, or rely on generated output as professional advice. Review AI-generated results before using them."] },
        { title: "Plans and recurring billing", body: ["Plan price, currency, and billing period are shown before you confirm payment in Stripe Checkout. Paid subscriptions renew for the displayed period until canceled. Manage payment methods, invoices, and cancellation through Manage Subscription in your dashboard, where supported by the Stripe portal configuration. Cancellation stops future renewals; the end date and remaining access are shown in your account.", "Taxes are handled according to the operator's applicable legal status and the information shown at checkout. A VAT number is not published here. Where a statutory VAT exemption applies, invoices must reflect that exemption; otherwise applicable taxes must be shown and collected as required by law."] },
        { title: "Availability and responsibility", body: ["The service is provided online and may be updated or temporarily interrupted for maintenance, security, or provider outages. AI output may be incomplete or inaccurate. Nothing in these terms limits rights or liability that cannot lawfully be limited. Contact support at the address shown on the Contact page."] },
      ],
    },
    "sale-terms": {
      title: "Terms of sale",
      intro: "These terms describe paid SnapTextAI subscriptions and billing.",
      sections: [
        { title: "Seller and contact", body: [`SnapTextAI is operated by an individual business operator under this public brand. Business correspondence address: ${correspondence}. Contact: ${email}; telephone: ${phone}. The address is used for correspondence and is not represented as business premises.`] },
        { title: "Price and subscription", body: ["The selected plan, price, currency, and renewal period are displayed in Stripe Checkout before payment. Monthly and yearly plans are recurring subscriptions. The subscription renews automatically at the displayed interval until canceled. Stripe processes the payment and provides billing documents according to the operator's Stripe account configuration and applicable law.", "VAT is treated according to the operator's legal status. No VAT number is published here. Where the operator qualifies for a statutory exemption, the invoice must state the applicable exemption; any tax that is due must be disclosed and handled as required by law."] },
        { title: "Cancellation, withdrawal, and refunds", body: ["You can cancel renewal through Manage Subscription in your dashboard. Cancellation stops future renewals; it does not by itself refund a charge already made. Contact support at the email on the Contact page to request a refund or exercise any statutory withdrawal right. Requests are handled under the applicable consumer rules and the circumstances of the purchase; no blanket waiver of statutory rights is made here."] },
      ],
    },
    cookies: {
      title: "Cookie policy",
      intro: "SnapTextAI uses essential browser storage and asks before loading optional analytics.",
      sections: [
        { title: "Essential and optional technologies", body: ["Authentication and security storage is needed for account features. The cookie-preference panel saves your choice in local browser storage for up to 180 days. Google Tag Manager and GA4 are loaded only when analytics consent is enabled. No advertising tags are installed by this application code."] },
        { title: "Change your choice", body: ["Choose Accept, Reject, or Customize in the privacy panel. Reopen Cookie Settings from the website footer at any time. Rejecting analytics does not disable essential sign-in and security storage."] },
      ],
    },
    refunds: {
      title: "Cancellation, withdrawal, and refunds",
      intro: "Canceling a subscription and exercising a statutory withdrawal right are separate requests.",
      sections: [
        { title: "Cancel future renewals", body: ["Use Manage Subscription in the dashboard to cancel an eligible plan through Stripe's customer portal. Cancellation stops future renewal. The current subscription end date and any remaining access are shown in your account."] },
        { title: "Withdrawal and refund requests", body: [`Contact ${email} with the account email, purchase date, and request. Applicable statutory withdrawal rights and exceptions are assessed for each purchase. Canceling future renewals does not automatically refund a completed billing period. No blanket waiver of consumer rights is imposed by this policy.`] },
      ],
    },
  },
  fr: {
    contact: {
      title: "Contact et demandes relatives aux données",
      intro: "Contactez SnapTextAI au sujet du service, de votre compte ou de vos données personnelles.",
      contactForm: true,
      sections: [
        { title: "Assistance", body: [`Écrivez à ${email} ou utilisez le formulaire ci-dessous. Adresse de correspondance professionnelle : ${correspondence}. Téléphone : ${phone}. Il s’agit du domicile du propriétaire utilisé pour la correspondance ; cette adresse n’est pas présentée comme un établissement professionnel.`] },
        { title: "Demandes relatives aux données", body: [`Écrivez à ${email} pour exercer vos droits d’accès, de rectification, d’effacement, de limitation, d’opposition ou de portabilité. Les utilisateurs connectés peuvent également exporter les données disponibles dans leur compte et demander sa suppression depuis le tableau de bord. N’envoyez pas de mot de passe ni de données de carte bancaire. En France, vous pouvez saisir la CNIL si vous estimez que vos droits n’ont pas été respectés.`] },
      ],
    },
    "legal-notice": {
      title: "Mentions légales",
      intro: "Informations de publication et de contact de SnapTextAI.",
      sections: [
        { title: "Éditeur", body: [`Nom public : SnapTextAI. Le service est exploité par un entrepreneur individuel sous cette marque. Adresse de correspondance professionnelle : ${correspondence}. Il s’agit du domicile du propriétaire utilisé pour la correspondance ; l’adresse n’est pas présentée comme un établissement professionnel. Contact : ${email} ; téléphone : ${phone}.`] },
        { title: "Hébergement et prestataires", body: ["Le site est hébergé sur Vercel. L’authentification, la base de données et le stockage de fichiers sont fournis par Supabase. Stripe traite les paiements et abonnements. Cloudflare et Remove.bg traitent certains fichiers selon l’outil utilisé."] },
      ],
    },
    privacy: {
      title: "Politique de confidentialité",
      intro: "Cette politique décrit les données personnelles utilisées pour fournir SnapTextAI et la manière d’exercer vos droits.",
      sections: [
        { title: "Exploitant et contact", body: [`SnapTextAI est la marque publique utilisée par un exploitant individuel. Adresse de correspondance professionnelle : ${correspondence}. Contact confidentialité et assistance : ${email} ; téléphone : ${phone}. Cette adresse sert à la correspondance et n’est pas présentée comme un établissement professionnel.`] },
        { title: "Données et finalités", body: ["Supabase Auth traite l’adresse e-mail du compte et les informations de connexion et de session. L’application peut conserver l’historique des outils, les noms de fichiers, les textes générés, la langue et des métadonnées dans votre compte. Les événements d’usage servent à appliquer les limites des offres gratuites et payantes. Stripe traite les paiements et transmet à SnapTextAI les identifiants et statuts d’abonnement ; les données de carte sont traitées par Stripe.", "Lors de l’utilisation d’un outil de fichier ou d’image, le fichier peut être temporairement stocké dans Supabase Storage et traité par le prestataire nécessaire à l’outil, notamment Cloudflare ou Remove.bg. Les messages du formulaire de contact sont transmis à l’adresse d’assistance via le prestataire d’envoi d’e-mails configuré. Google Tag Manager et GA4 ne sont chargés qu’après votre accord pour les statistiques ; les événements ne contiennent pas d’identifiant de compte, d’adresse e-mail, de contenu importé ou de données de paiement."] },
        { title: "Conservation et gestion du compte", body: ["L’application est configurée pour supprimer les fichiers importés après sept jours lorsque la tâche planifiée de production et son secret sont configurés et actifs. Les textes et métadonnées d’historique sont conservés jusqu’à leur suppression ou à celle du compte, sauf durée supérieure nécessaire à la sécurité, aux sauvegardes ou à une obligation légale. Stripe conserve ses données de facturation selon ses propres règles et la loi applicable.", "Vous pouvez modifier l’adresse e-mail et le nom affiché dans les paramètres du compte, exporter les données disponibles ou demander la suppression du compte depuis le tableau de bord. La suppression du compte résilie tout abonnement Stripe avant la suppression des données du compte. Contactez l’assistance pour toute autre demande."] },
        { title: "Prestataires et droits", body: ["Le service utilise Vercel pour l’hébergement, Supabase pour l’authentification, la base de données et le stockage, Stripe pour les paiements, Cloudflare et Remove.bg pour certains traitements de fichiers, ainsi qu’un prestataire d’e-mail pour les messages de contact. Ces prestataires traitent les données conformément à leurs propres conditions. Les statistiques facultatives restent désactivées jusqu’au consentement ; vous pouvez modifier votre choix dans les paramètres des cookies.", `Pour toute demande relative aux données, écrivez à ${email}. Vous pouvez également saisir la CNIL en France.`] },
      ],
    },
    terms: {
      title: "Conditions d’utilisation",
      intro: "Les présentes conditions régissent l’accès au site et aux outils SnapTextAI.",
      sections: [
        { title: "Service et comptes", body: ["SnapTextAI propose des outils en ligne pour les images et documents : OCR, conversion, compression, suppression de métadonnées et analyse assistée par IA. Un compte est nécessaire pour utiliser le tableau de bord et conserver l’historique. Protégez vos identifiants et fournissez des informations exactes.", "Vous devez avoir les droits et autorisations nécessaires pour importer chaque fichier et permettre les traitements liés à l’outil choisi. N’importez pas de contenu illicite, ne portez pas atteinte aux droits d’autrui, ne tentez pas de compromettre le service et ne considérez pas les résultats générés comme un conseil professionnel. Vérifiez les résultats IA avant de les utiliser."] },
        { title: "Offres et renouvellement", body: ["L’offre choisie, le prix, la devise et la période de facturation sont affichés dans Stripe Checkout avant la confirmation du paiement. Les abonnements payants se renouvellent à la période affichée jusqu’à leur résiliation. Gérez le moyen de paiement, les factures et la résiliation depuis « Gérer l’abonnement » dans le tableau de bord, selon les options du portail Stripe. La résiliation arrête les renouvellements futurs ; la date de fin et l’accès restant sont indiqués dans le compte.", "Les taxes sont traitées conformément au statut légal applicable et aux informations affichées lors du paiement. Aucun numéro de TVA n’est publié ici. Lorsqu’une exonération légale de TVA s’applique, la facture doit la mentionner ; sinon, les taxes applicables doivent être affichées et collectées conformément à la loi."] },
        { title: "Disponibilité et responsabilité", body: ["Le service est fourni en ligne et peut être mis à jour ou interrompu temporairement pour maintenance, sécurité ou indisponibilité d’un prestataire. Les résultats IA peuvent être incomplets ou inexacts. Aucune disposition ne limite un droit ou une responsabilité qui ne peut légalement être limité. Contactez l’assistance via la page Contact."] },
      ],
    },
    "sale-terms": {
      title: "Conditions générales de vente",
      intro: "Ces conditions décrivent les abonnements payants SnapTextAI et leur facturation.",
      sections: [
        { title: "Vendeur et contact", body: [`SnapTextAI est exploité par un entrepreneur individuel sous cette marque publique. Adresse de correspondance professionnelle : ${correspondence}. Contact : ${email} ; téléphone : ${phone}. Cette adresse sert à la correspondance et n’est pas présentée comme un établissement professionnel.`] },
        { title: "Prix et abonnement", body: ["L’offre choisie, le prix, la devise et la période de renouvellement sont présentés dans Stripe Checkout avant le paiement. Les offres mensuelles et annuelles sont des abonnements récurrents. L’abonnement est renouvelé automatiquement à la période affichée jusqu’à sa résiliation. Stripe traite le paiement et fournit les documents de facturation selon la configuration du compte Stripe et la loi applicable.", "La TVA est traitée selon le statut légal de l’exploitant. Aucun numéro de TVA n’est publié ici. Si l’exploitant bénéficie d’une exonération légale, la facture doit indiquer l’exonération applicable ; toute taxe due doit être déclarée et traitée conformément à la loi."] },
        { title: "Résiliation, rétractation et remboursements", body: ["Vous pouvez résilier le renouvellement depuis « Gérer l’abonnement » dans le tableau de bord via le portail Stripe. La résiliation arrête les renouvellements futurs ; elle ne rembourse pas automatiquement une période déjà payée. Écrivez à l’adresse d’assistance indiquée sur la page Contact pour demander un remboursement ou exercer un droit légal de rétractation. Les demandes sont examinées selon les règles de consommation applicables et les circonstances de l’achat ; aucun renoncement général aux droits légaux n’est imposé ici."] },
      ],
    },
    cookies: {
      title: "Politique relative aux cookies",
      intro: "SnapTextAI utilise un stockage de navigateur essentiel et demande votre accord avant de charger les statistiques facultatives.",
      sections: [
        { title: "Technologies essentielles et facultatives", body: ["Le stockage d’authentification et de sécurité est nécessaire aux fonctions de compte. Le panneau de préférences conserve votre choix dans le stockage local du navigateur pendant 180 jours au maximum. Google Tag Manager et GA4 ne sont chargés que si vous activez les statistiques. Le code de l’application n’installe aucun outil publicitaire."] },
        { title: "Modifier votre choix", body: ["Choisissez Tout accepter, Tout refuser ou Personnaliser dans le panneau de confidentialité. Vous pouvez rouvrir les paramètres des cookies depuis le pied de page. Le refus des statistiques ne désactive pas le stockage essentiel à la connexion et à la sécurité."] },
      ],
    },
    refunds: {
      title: "Résiliation, rétractation et remboursements",
      intro: "La résiliation d’un abonnement et l’exercice d’un droit légal de rétractation sont deux démarches distinctes.",
      sections: [
        { title: "Arrêter les renouvellements", body: ["Utilisez « Gérer l’abonnement » dans le tableau de bord pour résilier une offre éligible via le portail client Stripe. La résiliation arrête les renouvellements futurs. La date de fin de l’abonnement et l’accès restant apparaissent dans votre compte."] },
        { title: "Rétractation et remboursement", body: [`Écrivez à ${email} en indiquant l’adresse e-mail du compte, la date d’achat et votre demande. Les droits légaux de rétractation et leurs exceptions sont examinés pour chaque achat. La résiliation des renouvellements futurs ne rembourse pas automatiquement une période de facturation déjà payée. Cette politique ne comporte aucune renonciation générale aux droits des consommateurs.`] },
      ],
    },
  },
};

export function getLegalDocument(locale: "en" | "fr", slug: string) {
  return documents[locale][slug] ?? null;
}
