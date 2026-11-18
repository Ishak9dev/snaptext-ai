
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null) {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return "/dashboard";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = getSafeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(
        new URL(nextPath, url.origin)
      );
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", url.origin)
  );
}
