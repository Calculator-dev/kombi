import type { Metadata } from "next";
import { Suspense } from "react";
import { searchToQuery, vanSearchSchema } from "@kombi/shared";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { KombijiSearch } from "@/components/KombijiSearch";
import { searchVans } from "@/lib/vans";

export const metadata: Metadata = {
  title: "Kombiji za najam — filtrirajte po broju putnika, prtljagu i opremi",
  description: "Svi kombiji za najam na jednom mjestu. Odaberite datume, broj putnika i kofera, mjenjač i opremu, i odmah vidite slobodne kombije s tačnom cijenom.",
  alternates: { canonical: "/kombiji" },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function KombijiPage({ searchParams }: Props) {
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const q = vanSearchSchema.parse(raw);
  const initial = await searchVans(searchToQuery({ ...q, page: undefined }));
  return (
    <>
      <Header />
      <main id="sadrzaj" className="search-page">
        <Suspense>
          <KombijiSearch initial={initial} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
