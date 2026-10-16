import Link from "next/link";
import { SITE } from "@/lib/site";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="kombi.ba početna">
      Kombi<span>.</span>ba
    </Link>
  );
}

export function Header() {
  return (
    <>
      <a className="skip" href="#sadrzaj">
        Preskoči na sadržaj
      </a>
      <div className="topbar">
        <div className="wrap">
          <span>Najam kombija, Sarajevo</span>
          <span>43.8563° N, 18.4131° E</span>
          <span>Viber / WhatsApp {SITE.phone}</span>
        </div>
      </div>
      <header className="header">
        <div className="wrap">
          <Logo />
          <nav className="nav" aria-label="Glavna navigacija">
            <Link href="/#kombi">Kombi</Link>
            <Link href="/#cijene">Cijene</Link>
            <Link href="/#uslovi">Uslovi</Link>
            <Link href="/#pitanja">Pitanja</Link>
            <Link href="/#rezervacija" className="cta">
              Rezerviši
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
