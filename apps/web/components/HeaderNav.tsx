"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { dict, localePath, switchPath, type Locale } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";

/** The links: in a row on wider screens, behind a menu button on phones. */
export function HeaderNav({ locale }: { locale: Locale }) {
  const t = dict(locale).header;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const lp = (p: string) => localePath(locale, p);

  // A new page closes the menu; so does Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="header-end">
      <nav id="main-nav" className="nav" aria-label={t.nav} data-open={open || undefined}>
        <Link href={lp("/kombiji")} onClick={() => setOpen(false)}>{t.vans}</Link>
        <Link href={lp("/#paketi")} className="nav-owner" onClick={() => setOpen(false)}>{t.owners}</Link>
        <a
          href={switchPath(pathname)}
          className="nav-lang"
          hrefLang={locale === "bs" ? "en" : "bs"}
          lang={locale === "bs" ? "en" : "bs"}
          aria-label={t.switchLabel}
          // Keeps the search filters when switching language on /kombiji.
          onClick={(e) => {
            e.currentTarget.href = switchPath(pathname) + window.location.search;
          }}
        >
          <span className="lang-long">{t.switchTo}</span>
          <span className="lang-short" aria-hidden="true">{t.switchShort}</span>
        </a>
        <Link href={lp("/#rezervacija")} className="cta" onClick={() => setOpen(false)}>
          {t.book}
        </Link>
      </nav>
      <ThemeToggle label={t.theme} />
      <button
        type="button"
        className="menu-btn"
        aria-expanded={open}
        aria-controls="main-nav"
        aria-label={open ? t.closeMenu : t.menu}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}
