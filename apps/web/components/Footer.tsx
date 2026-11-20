import Link from "next/link";
import { dict, localePath, type Locale } from "@/lib/i18n";
import { LANDINGS, SITE } from "@/lib/site";
import { CookieSettingsLink } from "./CookieConsent";

export function Footer({ locale = "bs" }: { locale?: Locale }) {
  const t = dict(locale).footer;
  const lp = (p: string) => localePath(locale, p);
  return (
    <footer className="footer">
      <div className="wrap cols">
        {/* The landing pages are written for searches in Bosnian. */}
        <nav aria-label={t.rentals} lang="bs">
          <b>{dict("bs").footer.rentals}</b>
          {Object.entries(LANDINGS).map(([slug, l]) => (
            <Link key={slug} href={`/${slug}`}>
              {l.h1.join(" ")}
            </Link>
          ))}
        </nav>
        <nav aria-label={t.info}>
          <b>Info</b>
          <Link href={lp("/kombiji")}>{t.allVans}</Link>
          <Link href={lp("/#paketi")}>{t.plans}</Link>
          <Link href={lp("/#kontakt")}>{t.contact}</Link>
          <Link href={lp("/privatnost")}>{t.privacy}</Link>
          <Link href={lp("/kolacici")}>{t.cookies}</Link>
          <CookieSettingsLink />
        </nav>
        <div>
          <b>{t.contact}</b>
          <span>{SITE.city}, {t.country}</span>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </div>
        <div>
          <b>{t.company}</b>
          <span lang="bs">{SITE.company.name}</span>
          <span>{SITE.company.address}</span>
          <span>{t.idNumber}: {SITE.company.idNumber}</span>
        </div>
      </div>
      <div className="wrap copy">
        © {new Date().getFullYear()} kombi.ba · <span lang="bs">{SITE.company.name}</span>
      </div>
    </footer>
  );
}
