import Link from "next/link";
import { dict, localePath, type Locale } from "@/lib/i18n";
import { HeaderNav } from "./HeaderNav";

export function Logo({ href = "/", label = "kombi.ba početna" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="logo" aria-label={label}>
      {/* Two versions: dark ink on the light theme, cream ink on the dark theme (switched in CSS). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-light" src="/logo.png" alt="" width={640} height={191} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-dark" src="/logo-dark.png" alt="" width={640} height={191} />
    </Link>
  );
}

export function Header({ locale = "bs" }: { locale?: Locale }) {
  const t = dict(locale).header;
  return (
    <>
      <a className="skip" href="#sadrzaj">
        {t.skip}
      </a>
      <div className="topbar">
        <div className="wrap">
          <span>{t.topLeft}</span>
          <span>{t.topRight}</span>
        </div>
      </div>
      <header className="header">
        <div className="wrap">
          <Logo href={localePath(locale, "/")} label={t.home} />
          <HeaderNav locale={locale} />
        </div>
      </header>
    </>
  );
}
