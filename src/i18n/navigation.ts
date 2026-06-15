import type { Locale } from "./config";
import { defaultLocale, isLocale, locales } from "./config";

export function localizedPath(locale: Locale, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `/${locale}`;
  return `/${locale}${normalized}`;
}

export function stripLocaleFromPath(pathname: string): {
  locale: Locale | null;
  pathname: string;
} {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  if (maybeLocale && isLocale(maybeLocale)) {
    const rest = "/" + segments.slice(2).join("/");
    return {
      locale: maybeLocale as Locale,
      pathname: rest === "/" ? "/" : rest.replace(/\/$/, "") || "/",
    };
  }

  return { locale: null, pathname };
}

export function switchLocalePath(
  currentPathname: string,
  nextLocale: Locale
): string {
  const { pathname } = stripLocaleFromPath(currentPathname);
  return localizedPath(nextLocale, pathname);
}

export function detectLocaleFromAcceptLanguage(
  header: string | null
): Locale {
  if (!header) return defaultLocale;

  const preferred = header
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return { lang: lang.split("-")[0].toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  const supported: Locale[] = [...locales];
  for (const { lang } of preferred) {
    const match = supported.find((locale) => locale === lang);
    if (match) return match;
  }

  return defaultLocale;
}
