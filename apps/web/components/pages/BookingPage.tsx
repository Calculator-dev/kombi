import Link from "next/link";
import { isIsoDate } from "@kombi/shared";
import { dict, localePath, type Locale } from "@/lib/i18n";
import { getVan } from "@/lib/vans";
import { BookingFlow } from "../BookingFlow";
import { Logo } from "../Header";

export type BookingParams = Promise<{ van?: string; start?: string; end?: string }>;

/** The booking form, or a pointer back to the calendar when the link is incomplete. */
export async function BookingPage({ searchParams, locale }: { searchParams: BookingParams; locale: Locale }) {
  const { van: slug, start, end } = await searchParams;
  const van = slug ? await getVan(slug) : null;
  const valid = van && isIsoDate(start) && isIsoDate(end) && end > start;
  const d = dict(locale);
  const t = d.booking;
  return valid ? (
    <BookingFlow van={van} start={start} end={end} />
  ) : (
    <>
      <header className="header">
        <div className="wrap">
          <Logo href={localePath(locale, "/")} label={d.header.home} />
        </div>
      </header>
      <main className="wrap login">
        <h1 className="display h-lg">{t.pickFirst}</h1>
        <p>{t.pickFirstText}</p>
        <Link className="btn-dark" href={localePath(locale, slug && van ? `/kombi/${slug}` : "/#rezervacija")}>
          {t.openCalendar}
        </Link>
      </main>
    </>
  );
}
