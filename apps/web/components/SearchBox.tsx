import Link from "next/link";

/** Homepage search: a plain form to /kombiji, so it works before scripts load. */
export function SearchBox() {
  return (
    <div className="quick-search">
      <form action="/kombiji" role="search" className="search-box">
        <label htmlFor="home-q" className="sr-only">Pretraži kombije</label>
        <input id="home-q" name="q" type="search" placeholder="npr. Sarajevo ili Vito" maxLength={80} autoComplete="off" enterKeyHint="search" />
        <button type="submit" className="btn-dark">Traži</button>
      </form>
      <Link href="/kombiji" className="btn-ghost">Svi kombiji <span aria-hidden="true">→</span></Link>
    </div>
  );
}
