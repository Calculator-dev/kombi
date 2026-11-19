import { dict, localePath, type Locale } from "@/lib/i18n";

/** Homepage search: a plain form to /kombiji, so it works before scripts load. */
export function SearchBox({ locale = "bs" }: { locale?: Locale }) {
  const t = dict(locale).search;
  return (
    <form action={localePath(locale, "/kombiji")} role="search" className="search-box quick-search">
      <label htmlFor="home-q" className="sr-only">{t.label}</label>
      <input id="home-q" name="q" type="search" placeholder={t.placeholder} maxLength={80} autoComplete="off" enterKeyHint="search" />
      <button type="submit" className="btn-dark">{t.submit}</button>
    </form>
  );
}
