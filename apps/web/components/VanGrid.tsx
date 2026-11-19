import Link from "next/link";
import type { VanCard } from "@kombi/shared";
import { dict, localePath, type Locale } from "@/lib/i18n";
import { VanCardView } from "./VanCardView";

const SHOWN = 6;

/** A few vans on the homepage, with a link to all of them on /kombiji. */
export function VanGrid({ vans, locale = "bs" }: { vans: VanCard[]; locale?: Locale }) {
  const t = dict(locale).grid;
  return (
    <section id="kombiji" className="section" aria-labelledby="kombiji-h">
      <div className="wrap">
        <div className="van-head">
          <h2 id="kombiji-h" className="display h-lg">{t.title}</h2>
          <p className="caption">
            {t.count(vans.length)}
          </p>
        </div>
        {vans.length === 0 && <p className="placeholder-box">{t.empty}</p>}
        <ul className="van-grid">
          {vans.slice(0, SHOWN).map((v, i) => (
            <VanCardView key={v.id} van={v} list={locale === "en" ? "Home (EN)" : "Početna"} index={i} />
          ))}
        </ul>
        <Link className="btn-dark see-all" href={localePath(locale, "/kombiji")}>
          {vans.length > SHOWN ? t.all(vans.length) : t.allShort} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
