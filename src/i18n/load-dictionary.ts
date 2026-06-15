import type { Locale } from "./config";
import type { Dictionary } from "./types";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  de: () => import("./dictionaries/de.json").then((m) => m.default),
  tr: () => import("./dictionaries/tr.json").then((m) => m.default),
  ru: () => import("./dictionaries/ru.json").then((m) => m.default),
  ar: () => import("./dictionaries/ar.json").then((m) => m.default),
  he: () => import("./dictionaries/he.json").then((m) => m.default),
  pl: () => import("./dictionaries/pl.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  fr: () => import("./dictionaries/fr.json").then((m) => m.default),
  es: () => import("./dictionaries/es.json").then((m) => m.default),
  ca: () => import("./dictionaries/ca.json").then((m) => m.default),
};

export function loadDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
