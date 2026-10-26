import Link from "next/link";
import type { VanCard } from "@kombi/shared";
import { VanCardView } from "./VanCardView";

const SHOWN = 6;

/** A few vans on the homepage, with a link to all of them on /kombiji. */
export function VanGrid({ vans }: { vans: VanCard[] }) {
  return (
    <section id="kombiji" className="section" aria-labelledby="kombiji-h">
      <div className="wrap">
        <div className="van-head">
          <h2 id="kombiji-h" className="display h-lg">Kombiji</h2>
          <p className="caption">
            {vans.length} {vans.length === 1 ? "kombi" : "kombija"} · odaberite datume za tačnu cijenu
          </p>
        </div>
        {vans.length === 0 && <p className="placeholder-box">Kombiji se učitavaju. Osvježite stranicu za minutu.</p>}
        <ul className="van-grid">
          {vans.slice(0, SHOWN).map((v, i) => (
            <VanCardView key={v.id} van={v} list="Početna" index={i} />
          ))}
        </ul>
        {vans.length > 0 && (
          <Link className="btn-dark see-all" href="/kombiji">
            {vans.length > SHOWN ? `Svih ${vans.length} kombija` : "Pretraži kombije"} <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </section>
  );
}
