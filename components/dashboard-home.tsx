import Link from "next/link";
import { ArrowRight, ScanText } from "lucide-react";
import ToolUsageSummary from "@/components/tool-usage-summary";
import { DASHBOARD_TOOLS } from "@/lib/dashboard-tools";
import DashboardSubscription from "@/components/dashboard-subscription";

export default function DashboardHome({ language = "en", checkout }: { language?: "en" | "fr"; checkout?: string }) {
  const isFrench = language === "fr";
  const prefix = isFrench ? "/fr/dashboard" : "/dashboard";

  return (
    <main lang={language} className="min-h-screen bg-slate-50">
      <section className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
        <DashboardSubscription language={language} checkout={checkout} />
        <ToolUsageSummary language={language} />
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">
            {isFrench ? "Espace de travail" : "Workspace"}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {isFrench ? "Choisissez un outil" : "Choose a tool"}
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            {isFrench
              ? "Tous vos outils SnapText AI sont réunis ici. Choisissez une tâche pour commencer."
              : "All SnapText AI tools are in one place. Choose a task to get started."}
          </p>
        </div>

        <nav aria-label={isFrench ? "Outils" : "Tools"} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DASHBOARD_TOOLS.map((tool) => {
            const [title, description] = isFrench ? tool.fr : tool.en;
            return (
              <Link
                key={tool.slug}
                href={`${prefix}/${tool.slug}`}
                className="group flex min-h-40 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <ScanText size={19} aria-hidden="true" />
                </span>
                <span className="mt-4 flex items-center justify-between gap-3 font-semibold text-slate-900">
                  {title}
                  <ArrowRight size={17} className="shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-violet-700" aria-hidden="true" />
                </span>
                <span className="mt-1 text-sm leading-6 text-slate-600">{description}</span>
              </Link>
            );
          })}
        </nav>
      </section>
    </main>
  );
}
