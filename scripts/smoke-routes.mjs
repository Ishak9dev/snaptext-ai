import assert from "node:assert/strict";

const baseUrl = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const slugs = [
  "image-to-text",
  "document-analyzer",
  "form-extractor",
  "receipt-scanner",
  "image-description",
  "background-remover",
  "image-compressor",
  "image-converter",
  "image-to-pdf",
  "metadata-remover",
];
const legalSlugs = ["privacy", "terms", "sale-terms", "legal-notice", "cookies", "refunds", "contact"];

async function readRoute(path, manualRedirect = false) {
  const response = await fetch(new URL(path, `${baseUrl}/`), {
    redirect: manualRedirect ? "manual" : "follow",
  });
  return { response, body: await response.text() };
}

const publicPaths = [
  "/",
  "/fr",
  ...legalSlugs.flatMap((slug) => [`/legal/${slug}`, `/fr/legal/${slug}`]),
  ...slugs.flatMap((slug) => [`/tools/${slug}`, `/fr/outils/${slug}`]),
];

for (const path of publicPaths) {
  const { response } = await readRoute(path);
  assert.equal(response.status, 200, `${path} should be available`);
}

for (const path of [
  "/tools/image-to-text",
  "/fr/outils/image-to-text",
]) {
  const { body } = await readRoute(path);
  assert.match(body, /rel="canonical"/, `${path} should have a canonical URL`);
  assert.ok(body.includes("hrefLang="), `${path} should expose language alternates`);
}

const frenchTool = await readRoute("/fr/outils/image-to-text");
assert.match(frenchTool.body, /<main lang="fr"/, "French tool content should declare French");

const frenchHome = await readRoute("/fr");
assert.ok(
  frenchHome.body.includes("<title>Outils IA pour images et documents | SnapText AI</title>"),
  "French homepage title should include the brand suffix once"
);
assert.ok(frenchHome.body.includes("Pro mensuel"), "French pricing should include the monthly plan");
assert.ok(frenchHome.body.includes("Conditions de vente"), "French pricing should link to sale terms");
assert.ok(!frenchHome.body.includes("4,99 €"), "Pricing schema should not publish a stale hardcoded price");

const englishPricing = await readRoute("/");
for (const label of ["Pro Monthly", "SnapText AI Pro Yearly", "Terms of Sale", "Cancellation and refunds"]) {
  assert.ok(englishPricing.body.includes(label), `English pricing should include ${label}`);
}
const frenchPricing = await readRoute("/fr");
for (const label of ["Pro mensuel", "SnapText AI Pro annuel", "Conditions de vente", "Résiliation et remboursements"]) {
  assert.ok(frenchPricing.body.includes(label), `French pricing should include ${label}`);
}
assert.ok(!englishPricing.body.includes("operating authorization is verified"), "Pricing should not contain obsolete legal gating");
assert.ok(
  englishPricing.body.includes("md:grid-cols-2 lg:grid-cols-3"),
  "Pricing cards should use the responsive desktop and tablet grid"
);

const sitemap = await readRoute("/sitemap.xml");
assert.equal(sitemap.response.status, 200, "Sitemap should be available");
for (const slug of slugs) {
  assert.ok(sitemap.body.includes(`/tools/${slug}`), `Sitemap should include /tools/${slug}`);
  assert.ok(sitemap.body.includes(`/fr/outils/${slug}`), `Sitemap should include /fr/outils/${slug}`);
}
for (const slug of legalSlugs) {
  assert.ok(sitemap.body.includes(`/legal/${slug}`), `Sitemap should include /legal/${slug}`);
  assert.ok(sitemap.body.includes(`/fr/legal/${slug}`), `Sitemap should include /fr/legal/${slug}`);
}

const protectedPaths = [
  "/dashboard",
  "/fr/dashboard",
  "/dashboard/history",
  "/fr/dashboard/history",
  ...slugs.flatMap((slug) => [`/dashboard/${slug}`, `/fr/dashboard/${slug}`]),
];

for (const path of protectedPaths) {
  const { response, body } = await readRoute(path, true);
  assert.ok(
    body.includes("NEXT_REDIRECT;replace;/login") ||
      (response.status === 307 && response.headers.get("location")?.startsWith("/login")),
    `${path} should stream a login redirect for an anonymous visitor`
  );
}

console.log(
  `Route smoke checks passed: ${publicPaths.length} public routes, ${protectedPaths.length} anonymous dashboard redirects, bilingual SEO, and sitemap entries.`
);
