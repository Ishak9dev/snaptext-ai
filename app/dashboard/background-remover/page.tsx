
import { redirect } from "next/navigation";
import { ScanText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import BackgroundRemover from "@/components/background-remover";

export const instant = false;

export default async function BackgroundRemoverPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a
            href="/dashboard"
            className="flex items-center gap-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white">
              <ScanText size={20} />
            </div>

            <span className="text-lg font-bold text-slate-900">
              SnapText <span className="text-violet-600">AI</span>
            </span>
          </a>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            AI Background Remover
          </h1>

          <p className="mt-2 text-slate-600">
            Remove image backgrounds automatically with AI.
          </p>
        </div>

        <BackgroundRemover />
      </section>
    </main>
  );
}
