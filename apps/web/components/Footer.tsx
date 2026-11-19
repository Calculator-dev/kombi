import Link from "next/link";
import { LANDINGS, SITE } from "@/lib/site";
import { CookieSettingsLink } from "./CookieConsent";

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap cols">
        <nav aria-label="Najam kombija">
          <b>Najam kombija</b>
          {Object.entries(LANDINGS).map(([slug, l]) => (
            <Link key={slug} href={`/${slug}`}>
              {l.h1.join(" ")}
            </Link>
          ))}
        </nav>
        <nav aria-label="Informacije">
          <b>Info</b>
          <Link href="/kombiji">Svi kombiji</Link>
          <Link href="/#paketi">Paketi</Link>
          <Link href="/#kontakt">Kontakt</Link>
          <Link href="/privatnost">Privatnost</Link>
          <Link href="/kolacici">Kolačići</Link>
          <CookieSettingsLink />
        </nav>
        <div>
          <b>Kontakt</b>
          <span>{SITE.city}, Bosna i Hercegovina</span>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </div>
      </div>
      <div className="wrap copy">© {new Date().getFullYear()} kombi.ba</div>
    </footer>
  );
}
