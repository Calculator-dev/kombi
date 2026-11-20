"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { dict, localePath, type Locale } from "@/lib/i18n";

/**
 * Text search in the header. On the results page it keeps the filters and only
 * changes the words; anywhere else it opens the results page with them.
 */
export function HeaderSearch({ locale }: { locale: Locale }) {
  const t = dict(locale).search;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const results = localePath(locale, "/kombiji");
  const onResults = pathname === results;
  const current = onResults ? (params.get("q") ?? "") : "";
  const [text, setText] = useState(current);
  useEffect(() => setText(current), [current]);

  const go = (q: string) => {
    const next = new URLSearchParams(onResults ? params.toString() : "");
    if (q) next.set("q", q);
    else next.delete("q");
    next.delete("page");
    const qs = next.toString();
    router.push(qs ? `${results}?${qs}` : results, { scroll: !onResults });
  };

  return (
    <form
      action={results}
      role="search"
      className="search-box header-search"
      onSubmit={(e) => {
        e.preventDefault();
        go(text.trim());
      }}
    >
      <label htmlFor="header-q" className="sr-only">{t.label}</label>
      <input
        id="header-q"
        name="q"
        type="search"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          // Clearing the box on the results page shows everything again.
          if (!e.target.value && onResults && current) go("");
        }}
        placeholder={t.placeholder}
        maxLength={80}
        autoComplete="off"
        enterKeyHint="search"
      />
      <button type="submit" className="btn-dark">{t.submit}</button>
    </form>
  );
}
