import type { Metadata } from "next";
import Link from "next/link";
import { isIsoDate } from "@kombi/shared";
import { BookingFlow } from "@/components/BookingFlow";
import { Logo } from "@/components/Header";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Rezervacija", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ start?: string; end?: string }> };

export default async function BookingPage({ searchParams }: Props) {
  const { start, end } = await searchParams;
  const settings = await getSettings();
  const valid = isIsoDate(start) && isIsoDate(end) && end > start;
  return valid ? (
    <BookingFlow settings={settings} start={start} end={end} />
  ) : (
    <>
      <header className="header">
        <div className="wrap">
          <Logo />
        </div>
      </header>
      <main className="wrap login">
        <h1 className="display h-lg">Prvo odaberite datume.</h1>
        <p>U kalendaru na početnoj odaberite dan preuzimanja i povratka, pa nastavite ovdje.</p>
        <Link className="btn-dark" href="/#rezervacija">
          Otvori kalendar
        </Link>
      </main>
    </>
  );
}
