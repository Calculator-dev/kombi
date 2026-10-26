"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { dayWord, isIsoDate, type VanCard } from "@kombi/shared";
import { api } from "@/lib/api";
import { km, shortDate } from "@/lib/format";
import { VanDrawing } from "./VanDrawing";

/**
 * The vans on offer. When dates are picked (?start&end in the address),
 * each van shows whether it's free then and the exact price.
 */
export function VanGrid({ initial }: { initial: VanCard[] }) {
  const params = useSearchParams();
  const start = params.get("start");
  const end = params.get("end");
  const dates = start && end && isIsoDate(start) && isIsoDate(end) && end > start ? { start, end } : null;
  const [cards, setCards] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!dates) {
      setCards(initial);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api<VanCard[]>(`/vans?start=${dates.start}&end=${dates.end}`)
      .then((c) => !cancelled && (setCards(c), setError(false)))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates?.start, dates?.end, initial]);

  const free = dates ? cards.filter((c) => c.available && !c.quote?.errors.length).length : cards.length;
  const query = dates ? `?start=${dates.start}&end=${dates.end}` : "";

  return (
    <section id="kombiji" className="section" aria-labelledby="kombiji-h">
      <div className="wrap">
        <div className="van-head">
          <h2 id="kombiji-h" className="display h-lg">
            {dates ? (
              <>
                Slobodno
                <br />
                {shortDate(dates.start)} – {shortDate(dates.end)}
              </>
            ) : (
              "Kombiji"
            )}
          </h2>
          <p className="caption" aria-live="polite">
            {loading
              ? "Provjeravam termine…"
              : error
                ? "Termini se nisu učitali. Osvježite stranicu."
                : dates
                  ? `${free} od ${cards.length} slobodno`
                  : `${cards.length} ${cards.length === 1 ? "kombi" : "kombija"} · odaberite datume za tačnu cijenu`}
          </p>
        </div>
        {cards.length === 0 && <p className="placeholder-box">Kombiji se učitavaju. Osvježite stranicu za minutu.</p>}
        <ul className={`van-grid${loading ? " loading" : ""}`}>
          {cards.map((c) => {
            const unavailable = dates && (!c.available || Boolean(c.quote?.errors.length));
            return (
              <li key={c.id} className="van-card" data-unavailable={unavailable || undefined}>
                <Link href={`/kombi/${c.slug}${query}`}>
                  <div className="van-photo">
                    {c.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.photo.thumbUrl} alt={c.name} width={640} height={480} loading="lazy" />
                    ) : (
                      <VanDrawing compact />
                    )}
                  </div>
                  <div className="van-info">
                    <h3>{c.name}</h3>
                    <p className="mono">
                      {c.seats} sjedišta · {c.gearbox.toLowerCase()} · {c.year} · {c.location}
                    </p>
                    <div className="van-price">
                      {dates && c.quote ? (
                        unavailable ? (
                          <span className="taken-note">
                            {c.available ? c.quote.errors[0] : "Zauzet u tim danima"}
                          </span>
                        ) : (
                          <>
                            <span>
                              {c.quote.days} {dayWord(c.quote.days)}
                            </span>
                            <strong>{km(c.quote.total)}</strong>
                          </>
                        )
                      ) : (
                        <>
                          <span>od</span>
                          <strong>{km(c.dailyRate)}/dan</strong>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
