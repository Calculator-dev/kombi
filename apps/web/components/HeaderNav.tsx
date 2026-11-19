"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { dict, localePath, switchPath, type Locale } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";

/** The links: in a row on wider screens, behind a menu button on phones. */
export function HeaderNav({ locale }: { locale: Locale }) {
  const d = dict(locale);
  const t = d.header;
  const [sub, setSub] = useState(false);
  const group = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const lp = (p: string) => localePath(locale, p);

  // A new page closes the menu; so does Escape.
  useEffect(() => {
    setOpen(false);
    setSub(false);
  }, [pathname]);
  useEffect(() => {
    if (!open && !sub) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setOpen(false), setSub(false));
    // A click anywhere outside the "Kombiji" list closes it.
    const onClick = (e: MouseEvent) => sub && !group.current?.contains(e.target as Node) && setSub(false);
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open, sub]);
  const close = () => (setOpen(false), setSub(false));

  return (
    <div className="header-end">
      <nav id="main-nav" className="nav" aria-label={t.nav} data-open={open || undefined}>
        <div className="nav-group" ref={group}>
          <button type="button" aria-expanded={sub} aria-controls="nav-vans" onClick={() => setSub((s) => !s)}>
            {d.menu.toggle}
          </button>
          <div id="nav-vans" className="nav-sub" data-open={sub || undefined}>
            <Link href={lp("/kombiji")} onClick={close}>{d.menu.all}</Link>
            <Link href={lp("/kombiji?type=passenger")} onClick={close}>{d.category.passengerLong}</Link>
            <Link href={lp("/kombiji?type=cargo")} onClick={close}>
              {d.category.cargoLong}
              <small>{d.category.cargoNote}</small>
            </Link>
            <Link href={lp("/kombiji?type=car")} onClick={close}>
              {d.category.carLong}
              <small>{d.category.carNote}</small>
            </Link>
          </div>
        </div>
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
