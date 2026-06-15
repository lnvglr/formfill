import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { defaultLocale, isLocale } from "@/i18n/config";
import { localizedPath } from "@/i18n/navigation";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? localizedPath(defaultLocale, "/app");

  const cookieLocale = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("NEXT_LOCALE="))
    ?.split("=")[1];
  const locale =
    cookieLocale && isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}${localizedPath(locale, "/login")}?error=auth`
  );
}
