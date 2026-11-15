
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OcrWorkspace from "@/components/ocr-workspace";
export const instant = false;
export default async function DashboardPage() {
  const supabase = await createClient();

  // Verify the authenticated user on the server.
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  async function handleLogout() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();

    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-2xl font-bold text-violet-700"
          >
            SnapText AI
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/history"
              className="rounded-lg bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
            >
              History
            </Link>

            <form action={handleLogout}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-violet-600">
            YOUR WORKSPACE
          </p>

          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            Welcome to SnapText AI!
          </h1>

          <p className="mt-3 max-w-2xl text-slate-500">
            Your account is ready. You can now prepare your images
            for text extraction.
          </p>

          <OcrWorkspace />
        </div>
      </section>
    </main>
  );
}
