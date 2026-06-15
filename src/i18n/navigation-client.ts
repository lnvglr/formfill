"use client";

import { useLocale } from "@/i18n/client";
import { localizedPath } from "@/i18n/navigation";

export function useLocalizedPath() {
  const locale = useLocale();
  return (path: string) => localizedPath(locale, path);
}
