
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Stripe verifies signatures over the untouched body and does not use a
  // Supabase browser session. Keep auth/session middleware away from webhooks.
  if (pathname === "/api/stripe/webhook") {
    return NextResponse.next({ request });
  }

  const privateRoutes = ["/dashboard", "/fr/dashboard", "/account", "/settings"];
  const isPrivateRoute = privateRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const needsSupabaseSession = isPrivateRoute
    || pathname.startsWith("/api/")
    || pathname.startsWith("/tools/")
    || pathname.startsWith("/fr/outils/")
    || pathname === "/auth/callback";

  // Public marketing, metadata, and static routes don't perform server-side
  // authentication. Avoid initializing Supabase Auth during their prerender.
  if (!needsSupabaseSession) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh and validate the Supabase session
  await supabase.auth.getClaims();

  // Prevent private pages from being indexed
  if (isPrivateRoute) {
    supabaseResponse.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow"
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
