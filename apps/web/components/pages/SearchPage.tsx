import type { Metadata } from "next";
import { Suspense } from "react";
import { searchToQuery, vanSearchSchema } from "@kombi/shared";
import { dict, localePath, type Locale } from "@/lib/i18n";
import { searchVans } from "@/lib/vans";
import { Footer } from "../Footer";
import { Header } from "../Header";
import { KombijiSearch } from "../KombijiSearch";

export function searchMetadata(locale: Locale): Metadata {
  const t = dict(locale).results;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: { canonical: localePath(locale, "/kombiji"), languages: { bs: "/kombiji", en: "/en/kombiji" } },
  };
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** /kombiji: every van, with filters. */
export async function SearchPage({ searchParams, locale }: { searchParams: SearchParams; locale: Locale }) {
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const q = vanSearchSchema.parse(raw);
  const initial = await searchVans(searchToQuery({ ...q, page: undefined }));
  return (
    <>
      <Header locale={locale} />
      <main id="sadrzaj" className="search-page">
        <Suspense>
          <KombijiSearch initial={initial} />
        </Suspense>
      </main>
      <Footer locale={locale} />
    </>
  );
}
