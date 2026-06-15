import type { Locale } from "@/i18n/config";
import { localizedPath } from "@/i18n/navigation";

type LoginUrlOptions = {
  mode?: "sign-in" | "guest-upgrade";
  next?: string;
  locale?: Locale;
};

export function loginUrl({
  mode,
  next = "/app",
  locale = "de",
}: LoginUrlOptions = {}) {
  const params = new URLSearchParams();
  if (mode === "guest-upgrade") params.set("mode", "guest-upgrade");
  if (next && next !== "/app") params.set("next", next);
  const query = params.toString();
  const base = localizedPath(locale, "/login");
  return query ? `${base}?${query}` : base;
}

export function appPath(locale: Locale = "de") {
  return localizedPath(locale, "/app");
}
