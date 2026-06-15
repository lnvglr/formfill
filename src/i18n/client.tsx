"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LocaleHtmlAttributes } from "@/components/locale-html-attributes";
import { isRtlLocale, type Locale } from "./config";
import { loadDictionary } from "./load-dictionary";
import { createTranslator, type InterpolationValues, type Translator } from "./translate";
import type { Dictionary } from "./types";

type I18nContextValue = {
  locale: Locale;
  dictionary: Dictionary;
  t: Translator;
  setLocale: (locale: Locale) => Promise<void>;
  isLocaleChanging: boolean;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
};

export function I18nProvider({
  locale: initialLocale,
  dictionary: initialDictionary,
  children,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [dictionary, setDictionary] = useState(initialDictionary);
  const [isLocaleChanging, setIsLocaleChanging] = useState(false);

  useEffect(() => {
    setLocaleState(initialLocale);
    setDictionary(initialDictionary);
  }, [initialLocale, initialDictionary]);

  const setLocale = useCallback(
    async (nextLocale: Locale) => {
      if (nextLocale === locale) return;

      setIsLocaleChanging(true);
      try {
        const nextDictionary = await loadDictionary(nextLocale);
        setLocaleState(nextLocale);
        setDictionary(nextDictionary);
      } finally {
        setIsLocaleChanging(false);
      }
    },
    [locale]
  );

  const t = useMemo(() => createTranslator(dictionary), [dictionary]);

  const value = useMemo(
    () => ({ locale, dictionary, t, setLocale, isLocaleChanging }),
    [locale, dictionary, t, setLocale, isLocaleChanging]
  );

  return (
    <I18nContext.Provider value={value}>
      <LocaleHtmlAttributes
        locale={locale}
        dir={isRtlLocale(locale) ? "rtl" : "ltr"}
      />
      <div
        dir={isRtlLocale(locale) ? "rtl" : "ltr"}
        lang={locale}
        className="contents"
      >
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export function useT() {
  return useI18n().t;
}

export function useLocale() {
  return useI18n().locale;
}

export type { InterpolationValues };
