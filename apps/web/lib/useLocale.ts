"use client";

import { usePathname } from "next/navigation";
import { dict, localeOf, localePath, type Locale } from "./i18n";

/** In client components: the language of the current page (English under /en). */
export function useLocale() {
  const locale: Locale = localeOf(usePathname() ?? "/");
  return { locale, t: dict(locale), lp: (href: string) => localePath(locale, href) };
}
