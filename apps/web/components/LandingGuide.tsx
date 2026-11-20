import type { VanCard } from "@kombi/shared";
import { plural } from "@/lib/i18n";
import type { Landing } from "@/lib/site";

/**
 * The part of a landing page that is its own: the live offer in numbers
 * (from the listings, not written by hand), a short guide and its questions.
 */
export function LandingGuide({ page, vans }: { page: Landing; vans: VanCard[] }) {
  const priced = vans.filter((v) => !v.priceOnRequest).map((v) => v.dailyRate);
  const onRequest = vans.length - priced.length;
  const cities = [...new Set(vans.map((v) => v.location))].sort((a, b) => a.localeCompare(b, "bs"));
  const min = priced.length ? Math.min(...priced) : null;
  const max = priced.length ? Math.max(...priced) : null;
  const facts: [string, string][] = vans.length
    ? [
        ["Vozila u ponudi", String(vans.length)],
        ["Cijena po danu", min === null ? "na upit" : min === max ? `${min} KM` : `${min}–${max} KM`],
        ...(onRequest ? [["Cijena na upit", `${onRequest} ${plural(onRequest, "vozilo", "vozila", "vozila")}`] as [string, string]] : []),
        ["Gradovi", cities.join(", ")],
      ]
    : [];
  return (
    <>
      <section className="section" aria-labelledby="vodic-h">
        <div className="wrap split">
          <div>
            <h2 id="vodic-h" className="display h-lg">{page.guide.title}</h2>
            {facts.length > 0 && (
              <>
                <dl className="offer-facts">
                  {facts.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="caption">Izračunato iz vozila koja su trenutno na stranici; mijenja se kako iznajmljivači dodaju vozila i cijene.</p>
              </>
            )}
          </div>
          <ul className="rules">
            {page.guide.points.map(([h, p]) => (
              <li key={h}>
                <strong>{h}</strong>
                <p>{p}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="section" aria-labelledby="pitanja-h">
        <div className="wrap split">
          <h2 id="pitanja-h" className="display h-lg">Pitanja</h2>
          <div className="faq">
            {page.faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
