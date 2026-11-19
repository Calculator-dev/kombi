import Link from "next/link";
import { kindOf, type Category, type VanCard } from "@kombi/shared";
import { dict, localePath, type Locale } from "@/lib/i18n";
import { VanCarousel } from "./VanCarousel";

/** At most this many per row on the homepage; the rest are on /kombiji. */
const SHOWN = 12;

/**
 * The vehicles on the homepage: a sliding row of vans and one of cars, each
 * with a link to all of them on /kombiji. A landing page for one type shows
 * just that row.
 */
export function VanGrid({ vans, locale = "bs", category }: { vans: VanCard[]; locale?: Locale; category?: Category }) {
  const t = dict(locale).grid;
  const lp = (p: string) => localePath(locale, p);
  const list = locale === "en" ? "Home (EN)" : "Početna";
  const rows = [
    { id: "row-vans", title: t.vansTitle, vans: vans.filter((v) => kindOf(v.category) === "van"), href: "/kombiji?type=passenger", label: t.allVansLink },
    { id: "row-cars", title: t.carsTitle, vans: vans.filter((v) => kindOf(v.category) === "car"), href: "/kombiji?type=car", label: t.allCarsLink },
  ].filter((r) => r.vans.length > 0);
  // Vans link to all vans (passenger and cargo), not only passenger ones.
  rows.forEach((r) => r.id === "row-vans" && (r.href = "/kombiji"));
  if (category) for (const r of rows) r.href = `/kombiji?type=${category}`;

  return (
    <section id="kombiji" className="section" aria-labelledby="kombiji-h">
      <div className="wrap">
        <div className="van-head">
          <h2 id="kombiji-h" className="display h-lg">{t.title}</h2>
          <p className="caption">{t.count(vans.length)}</p>
        </div>
        {vans.length === 0 && <p className="placeholder-box">{t.empty}</p>}
        {rows.map((r) => (
          <VanCarousel key={r.id} id={r.id} title={r.title} vans={r.vans.slice(0, SHOWN)} allHref={lp(r.href)} allLabel={r.label} list={list} />
        ))}
        <Link className="btn-dark see-all" href={lp(category ? `/kombiji?type=${category}` : "/kombiji")}>
          {vans.length > SHOWN ? t.all(vans.length) : t.allShort} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
