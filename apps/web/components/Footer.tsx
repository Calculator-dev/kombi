import Link from "next/link";
import { LANDINGS, SITE } from "@/lib/site";

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
          <Link href="/#pitanja">Pitanja</Link>
          <Link href="/#kontakt">Kontakt</Link>
        </nav>
        <div>
          <b>Kontakt</b>
          <span>{SITE.city}, Bosna i Hercegovina</span>
          <a href={SITE.phoneHref}>{SITE.phone}</a>
          <span>{SITE.email}</span>
        </div>
      </div>
      <div className="wrap wordmark" aria-hidden="true">
        Kombi<span>.</span>ba
      </div>
      <div className="wrap copy">© {new Date().getFullYear()} kombi.ba</div>
    </footer>
  );
}
