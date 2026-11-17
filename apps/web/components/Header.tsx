import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

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
          <span>Najam kombija, Bosna i Hercegovina</span>
          <span>Bez plaćanja unaprijed</span>
        </div>
      </div>
      <header className="header">
        <div className="wrap">
          <Logo />
          <nav className="nav" aria-label="Glavna navigacija">
            <Link href="/kombiji">Kombiji</Link>
            <Link href="/#paketi">Paketi</Link>
            <Link href="/admin" className="nav-owner">Iznajmljujete kombi?</Link>
            <Link href="/#rezervacija" className="cta">
              Rezerviši
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>
    </>
  );
}
