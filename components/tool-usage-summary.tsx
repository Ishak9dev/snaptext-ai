"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CircleAlert, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DASHBOARD_TOOLS } from "@/lib/dashboard-tools";
import { useWorkspaceTranslation } from "@/lib/workspace-i18n";

type UsageRow = { tool_id?: string; tool_type?: string; used_count?: number; is_pro?: boolean };

export default function ToolUsageSummary({ language }: { language: "en" | "fr" }) {
  const [usage, setUsage] = useState<Record<string, number> | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const isFrench = language === "fr";
  const translate = useWorkspaceTranslation();
  const pricingHref = isFrench ? "/fr#pricing" : "/#pricing";
  const refreshUsage = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error: usageError } = await supabase.rpc("get_my_tool_usage");
      if (usageError) throw usageError;
      const rows = (data ?? []) as UsageRow[];
      if (rows.length === 0) throw new Error("Usage summary returned no tool records.");
      const counts: Record<string, number> = {};
      for (const row of rows) {
        const id = row.tool_id ?? row.tool_type;
        if (id) counts[id] = Number(row.used_count ?? 0);
      }
      if (DASHBOARD_TOOLS.some((tool) => counts[tool.id] === undefined)) {
        throw new Error("Usage summary did not include every tool.");
      }
      setUsage(counts);
      setIsPro(rows.some((row) => Boolean(row.is_pro)));
      setError(false);
    } catch (cause) {
      console.error("Could not load tool usage", cause);
      setError(true);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refreshUsage);
  }, [refreshUsage, refresh]);
  useEffect(() => {
    const reload = () => setRefresh((value) => value + 1);
    window.addEventListener("focus", reload);
    window.addEventListener("popstate", reload);
    window.addEventListener("pageshow", reload);
    document.addEventListener("visibilitychange", reload);
    return () => {
      window.removeEventListener("focus", reload);
      window.removeEventListener("popstate", reload);
      window.removeEventListener("pageshow", reload);
      document.removeEventListener("visibilitychange", reload);
    };
  }, []);

  return (
    <section aria-labelledby="tool-usage-heading" className="mb-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="tool-usage-heading" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {translate("Your Tool Usage")}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {translate("See how many free uses remain for each tool.")}
          </p>
        </div>
        {isPro && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">{translate("Pro · Unlimited access")}</span>}
      </div>

      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2"><CircleAlert size={17} />{translate("Unable to load tool usage.")}</span>
          <button type="button" onClick={() => setRefresh((value) => value + 1)} className="font-semibold underline underline-offset-2">{translate("Try again")}</button>
        </div>
      ) : usage === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={translate("Loading usage")}>
          {DASHBOARD_TOOLS.slice(0, 6).map((tool) => <div key={tool.id} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
          <span className="sr-only"><LoaderCircle className="animate-spin" />{translate("Loading…")}</span>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DASHBOARD_TOOLS.map((tool) => {
              const used = Math.min(2, Math.max(0, usage[tool.id] ?? 0));
              const remaining = Math.max(0, 2 - used);
              const title = isFrench ? tool.fr[0] : tool.en[0];
              return (
                <li key={tool.id} className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="min-w-0">
                    <Link href={`${isFrench ? "/fr/dashboard" : "/dashboard"}/${tool.slug}`} className="font-semibold text-slate-900 hover:text-violet-700">{title}</Link>
                    <p className={`mt-1 text-xs font-medium ${!isPro && remaining === 0 ? "text-amber-700" : "text-slate-500"}`}>
                      {isPro ? translate("Unlimited") : `${used}/2 ${translate("used · ")}${remaining} ${translate("remaining")}`}
                    </p>
                  </div>
                  {!isPro && remaining === 0 && <Link href={pricingHref} className="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700">{translate("Upgrade to Pro")}</Link>}
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            {isPro ? translate("Your Pro plan includes unlimited access to every tool.") : translate("Each tool includes 2 free lifetime uses. A use is counted only after a successful operation.")}
          </p>
          {!isPro && usage && DASHBOARD_TOOLS.some((tool) => (usage[tool.id] ?? 0) >= 2) && <p className="mt-2 text-sm font-medium text-violet-700">{translate("You’ve reached the free limit for a tool. Upgrade to Pro to continue with unlimited access.")} <Link className="underline underline-offset-2" href={pricingHref}>{translate("Explore Pro")}<ArrowRight className="ml-1 inline" size={14} /></Link></p>}
        </>
      )}
    </section>
  );
}
