import type { Metadata } from "next";
import Link from "next/link";
import { isIsoDate } from "@kombi/shared";
import { BookingFlow } from "@/components/BookingFlow";
import { Logo } from "@/components/Header";
import { getVan } from "@/lib/vans";

export const metadata: Metadata = { title: "Rezervacija", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ van?: string; start?: string; end?: string }> };

export default async function BookingPage({ searchParams }: Props) {
  const { van: slug, start, end } = await searchParams;
  const van = slug ? await getVan(slug) : null;
  const valid = van && isIsoDate(start) && isIsoDate(end) && end > start;
  return valid ? (
    <BookingFlow van={van} start={start} end={end} />
  ) : (
    <>
      <header className="header">
        <div className="wrap">
          <Logo />
        </div>
      </header>
      <main className="wrap login">
        <h1 className="display h-lg">Prvo odaberite kombi i datume.</h1>
        <p>Na početnoj odaberite dan preuzimanja i povratka, pa kombi koji je slobodan.</p>
        <Link className="btn-dark" href={slug && van ? `/kombi/${slug}` : "/#rezervacija"}>
          Otvori kalendar
        </Link>
      </main>
    </>
  );
}
