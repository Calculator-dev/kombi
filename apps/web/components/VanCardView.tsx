"use client";

import Link from "next/link";
import { kmToEur, type VanCard } from "@kombi/shared";
import { trackEcommerce } from "@/lib/analytics";
import { km } from "@/lib/format";
import { translateQuoteError } from "@/lib/i18n";
import { useLocale } from "@/lib/useLocale";
import { BrandLogo } from "./BrandLogo";
import { BagIcon, CargoIcon, FuelIcon, GearIcon, PinIcon, PlaneIcon, SeatIcon } from "./SpecIcons";
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
  const cargo = c.category === "cargo";
  // Four things people compare first, each with an icon.
  const specs: [React.ReactNode, string, string][] = [
    [<SeatIcon key="s" />, String(c.seats), t.card.seatsShort],
    cargo && c.cargoM3
      ? [<CargoIcon key="c" />, t.cargo.m3(c.cargoM3), c.payloadKg ? t.cargo.kg(c.payloadKg) : ""]
      : [<BagIcon key="b" />, String(c.luggage || "—"), t.card.luggageShort],
    [<GearIcon key="g" />, t.card.gearShort[c.gearbox] ?? c.gearbox, c.powerHp ? t.card.hp(c.powerHp) : ""],
    [<FuelIcon key="f" />, t.fuels[c.fuel] ?? c.fuel, ""],
  ];
  // The conditions that decide it: deposit, minimum days, discount for a week.
  const tags = [
    c.deposit === undefined || c.priceOnRequest ? null : c.deposit === 0 ? { text: t.card.noDeposit, good: true } : { text: t.card.deposit(c.deposit) },
    c.minDays && c.minDays > 1 ? { text: t.card.minDays(c.minDays) } : null,
    c.weeklyDiscountPct && !c.priceOnRequest ? { text: t.card.weekly(c.weeklyDiscountPct), good: true } : null,
  ].filter((x): x is { text: string; good?: boolean } => Boolean(x));
  const was = c.quote?.discount ? c.quote.total + c.quote.discount : null;
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
          <span className="van-year">{c.year}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {c.ownerLogo && <img className="van-owner-logo" src={c.ownerLogo} alt="" width={40} height={40} loading="lazy" />}
        </div>
        <div className="van-info">
          <h3>
            {c.brand && c.brand !== "other" && <BrandLogo brand={c.brand} size={20} />}
            {c.name}
          </h3>
          {c.rating && (
            <p className="van-rating" aria-label={t.reviews.summary(String(c.rating.average), c.rating.count)}>
              <span className="stars" aria-hidden="true">★</span> {c.rating.average.toFixed(1)} <span>({c.rating.count})</span>
            </p>
          )}
          {(cargo || c.category === "car") && <p className="van-kind">{cargo ? t.category.cargo : t.category.car}</p>}
          <ul className="van-specs">
            {specs.map(([icon, value, note], i) => (
              <li key={i}>
                {icon}
                <b>{value}</b>
                {note && <small>{note}</small>}
              </li>
            ))}
          </ul>
          {tags.length > 0 && (
            <ul className="van-tags">
              {tags.map((x) => <li key={x.text} data-good={x.good || undefined}>{x.text}</li>)}
            </ul>
          )}
          <p className="van-where">
            <PinIcon /> {c.location}
            {c.airport && <><span aria-hidden="true">·</span><PlaneIcon /> {t.card.airport}</>}
            {c.delivery && <><span aria-hidden="true">·</span>{t.card.delivery}</>}
          </p>
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
                    {c.quote.days} {t.days(c.quote.days)}
                    <small>≈ {kmToEur(c.quote.total)} €</small>
                  </span>
                  <span className="van-total">
                    {was && <s>{km(was)}</s>}
                    <strong>{km(c.quote.total)}</strong>
                  </span>
                </>
              )
            ) : c.priceOnRequest ? (
              <>
                <span>{t.card.price}</span>
                <strong>{t.onRequest}</strong>
              </>
            ) : (
              <>
                <span>
                  {t.card.from}
                  <small>≈ {kmToEur(c.dailyRate)} €/{t.perDay}</small>
                </span>
                <strong>{km(c.dailyRate)}/{t.perDay}</strong>
              </>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
