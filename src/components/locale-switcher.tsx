"use client";

import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { localeNames, type Locale } from "@/i18n/config";
import { switchLocalePath } from "@/i18n/navigation";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

type LocaleSwitcherProps = {
  className?: string;
};

export function LocaleSwitcher({ className }: LocaleSwitcherProps) {
  const { locale, setLocale, isLocaleChanging, t } = useI18n();
  const pathname = usePathname();

  const handleChange = async (nextLocale: Locale) => {
    if (nextLocale === locale || isLocaleChanging) return;

    await setLocale(nextLocale);

    const nextPath = switchLocalePath(pathname, nextLocale);
    window.history.replaceState(window.history.state, "", nextPath);
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <span className="sr-only">{t("localeSwitcher.label")}</span>
      <Globe
        className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <select
        value={locale}
        disabled={isLocaleChanging}
        onChange={(e) => void handleChange(e.target.value as Locale)}
        className="h-8 min-w-[8.5rem] cursor-pointer appearance-none rounded-md border border-border bg-background py-1 pr-3 pl-8 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70"
        aria-label={t("localeSwitcher.label")}
        aria-busy={isLocaleChanging}
      >
        {(Object.entries(localeNames) as [Locale, string][]).map(
          ([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          )
        )}
      </select>
    </div>
  );
}
