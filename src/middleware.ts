import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { defaultLocale, isLocale, locales } from "@/i18n/config";
import { detectLocaleFromAcceptLanguage } from "@/i18n/navigation";

function pathnameHasLocale(pathname: string) {
  return locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next")
  ) {
    return updateSession(request);
  }

  if (!pathnameHasLocale(pathname)) {
    const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
    const locale =
      cookieLocale && isLocale(cookieLocale)
        ? cookieLocale
        : detectLocaleFromAcceptLanguage(
            request.headers.get("accept-language")
          );

    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname =
      pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
    return NextResponse.redirect(nextUrl);
  }

  const response = await updateSession(request);
  const locale = pathname.split("/")[1];

  if (isLocale(locale)) {
    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
