"use client";

import Link from "next/link";
import type { VanCard } from "@kombi/shared";
import { trackEcommerce } from "@/lib/analytics";
import { km } from "@/lib/format";
import { translateQuoteError } from "@/lib/i18n";
import { useLocale } from "@/lib/useLocale";
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
  const { locale, t, lp } = useLocale();
  const unavailable = dates && c.quote && (c.available === false || c.quote.errors.length > 0);
  const query = dates ? `?start=${dates.start}&end=${dates.end}` : "";
  const specs = [
    t.card.seats(c.seats),
    c.luggage ? t.card.luggage(c.luggage) : null,
    (t.gearboxes[c.gearbox] ?? c.gearbox).toLowerCase(),
    c.powerHp ? t.card.hp(c.powerHp) : null,
    String(c.year),
  ].filter(Boolean);
  return (
    <li className="van-card" data-unavailable={unavailable || undefined}>
      <Link
        href={lp(`/kombi/${c.slug}${query}`)}
        onClick={() => trackEcommerce("select_item", [c], { item_list_name: list, index, prices: [c.priceOnRequest ? 0 : (c.quote?.total ?? c.dailyRate)] })}
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
            <p className="van-features">{c.features.slice(0, 4).map((f) => t.features[f] ?? f).join(" · ")}{c.features.length > 4 ? " …" : ""}</p>
          )}
          <div className="van-price">
            {dates && c.quote ? (
              unavailable ? (
                <span className="taken-note">{c.available === false ? t.card.taken : translateQuoteError(c.quote.errors[0]!, locale)}</span>
              ) : c.priceOnRequest ? (
                <>
                  <span>{c.quote.days} {t.days(c.quote.days)}</span>
                  <strong>{t.onRequest}</strong>
                </>
              ) : (
                <>
                  <span>
                    {c.quote.days} {t.days(c.quote.days)} · {km(c.dailyRate)}/{t.perDay}
                  </span>
                  <strong>{km(c.quote.total)}</strong>
                </>
              )
            ) : c.priceOnRequest ? (
              <>
                <span>{t.card.price}</span>
                <strong>{t.onRequest}</strong>
              </>
            ) : (
              <>
                <span>{t.card.from}</span>
                <strong>{km(c.dailyRate)}/{t.perDay}</strong>
              </>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
