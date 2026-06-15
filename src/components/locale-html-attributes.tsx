"use client";

import { useEffect } from "react";
import { getLocaleHtmlClass, type Locale } from "@/i18n/config";

type LocaleHtmlAttributesProps = {
  locale: Locale;
  dir: "ltr" | "rtl";
};

export function LocaleHtmlAttributes({ locale, dir }: LocaleHtmlAttributesProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dir;
    for (const cls of ["locale-ar", "locale-he", "locale-ru"] as const) {
      root.classList.toggle(cls, getLocaleHtmlClass(locale) === cls);
    }
  }, [locale, dir]);

  return null;
}
