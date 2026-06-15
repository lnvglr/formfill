export const locales = ["de", "tr", "ru", "ar", "he", "pl", "en", "fr", "es", "ca"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "de";

export const localeNames: Record<Locale, string> = {
  de: "Deutsch",
  tr: "Türkçe",
  ru: "Русский",
  ar: "العربية",
  he: "עברית",
  pl: "Polski",
  en: "English",
  fr: "Français",
  es: "Español",
  ca: "Català",
};

export const localeToBcp47: Record<Locale, string> = {
  de: "de-DE",
  tr: "tr-TR",
  ru: "ru-RU",
  ar: "ar-SA",
  he: "he-IL",
  pl: "pl-PL",
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  ca: "ca-ES",
};

export const rtlLocales: Locale[] = ["ar", "he"];

/** IBM Plex Mono is Latin/Cyrillic only — use locale sans for `font-mono` in these locales. */
export const sansMonoLocales: Locale[] = ["ar", "he", "ru"];

export function isRtlLocale(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

export function getLocaleHtmlClass(locale: Locale): string | undefined {
  if (locale === "ar") return "locale-ar";
  if (locale === "he") return "locale-he";
  if (locale === "ru") return "locale-ru";
  return undefined;
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
