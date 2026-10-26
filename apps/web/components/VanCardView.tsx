"use client";

import Link from "next/link";
import { dayWord, featureLabel, type VanCard } from "@kombi/shared";
import { trackEcommerce } from "@/lib/analytics";
import { km } from "@/lib/format";
import { VanDrawing } from "./VanDrawing";

/** One van in a list: photo, key specs and the price (exact total when dates are picked). */
export function VanCardView({
  van: c,
  dates,
  list = "Kombiji",
  index,
}: {
  van: VanCard;
  dates?: { start: string; end: string } | null;
  /** Where the card is shown, for analytics (e.g. "Početna", "Pretraga"). */
  list?: string;
  index?: number;
}) {
  const unavailable = dates && c.quote && (c.available === false || c.quote.errors.length > 0);
  const query = dates ? `?start=${dates.start}&end=${dates.end}` : "";
  const specs = [
    `${c.seats} sjedišta`,
    c.luggage ? `${c.luggage} kofera` : null,
    c.gearbox.toLowerCase(),
    c.powerHp ? `${c.powerHp} KS` : null,
    String(c.year),
  ].filter(Boolean);
  return (
    <li className="van-card" data-unavailable={unavailable || undefined}>
      <Link
        href={`/kombi/${c.slug}${query}`}
        onClick={() => trackEcommerce("select_item", [c], { item_list_name: list, index, prices: [c.quote?.total ?? c.dailyRate] })}
      >
        <div className="van-photo">
          {c.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.photo.thumbUrl} alt={c.name} width={640} height={480} loading="lazy" />
          ) : (
            <VanDrawing compact />
          )}
          <span className="van-city">{c.location}</span>
        </div>
        <div className="van-info">
          <h3>{c.name}</h3>
          <p className="mono">{specs.join(" · ")}</p>
          {c.features.length > 0 && (
            <p className="van-features">{c.features.slice(0, 4).map(featureLabel).join(" · ")}{c.features.length > 4 ? " …" : ""}</p>
          )}
          <div className="van-price">
            {dates && c.quote ? (
              unavailable ? (
                <span className="taken-note">{c.available === false ? "Zauzet u tim danima" : c.quote.errors[0]}</span>
              ) : (
                <>
                  <span>
                    {c.quote.days} {dayWord(c.quote.days)} · {km(c.dailyRate)}/dan
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
}
