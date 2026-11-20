import Link from "next/link";
import type { ReactNode } from "react";
import { FREE_TRIAL_DAYS, type PublicVan, type ReviewSummary, type Settings, type Terms, type VanLimits } from "@kombi/shared";
import { km } from "@/lib/format";
import { dict, ownerText, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";
import { PlanList } from "./PlanList";
import { VanDrawing } from "./VanDrawing";
import { VanMap } from "./VanMap";

/** Title and intro on the left, the calendar ticket (passed in) on the right. */
export function Hero({
  title,
  intro,
  specs,
  media,
  search,
  children,
}: {
  title: ReactNode;
  /** One paragraph, or several. */
  intro: string | readonly string[];
  specs: [string, string][];
  /** Shown above everything else, e.g. a van's photos. */
  media?: ReactNode;
  /** Shown under the intro, e.g. the search box. */
  search?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="hero-title">
      {media && <div className="wrap hero-media">{media}</div>}
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <h1 id="hero-title" className="display h-xl">
            {title}
          </h1>
          {(typeof intro === "string" ? [intro] : intro).map((p) => (
            <p key={p} className="lead">{p}</p>
          ))}
          {search}
          <dl className="specs">
            {specs.map(([t, d]) => (
              <div key={t}><dt>{t}</dt><dd>{d}</dd></div>
            ))}
          </dl>
        </div>
        {children}
      </div>
    </section>
  );
}

/** Photos, specs and description of one van. */
export function VanDetails({ van, locale = "bs" }: { van: PublicVan; locale?: Locale }) {
  const d = dict(locale);
  const t = d.van;
  return (
    <section id="kombi" className="section" aria-labelledby="kombi-h">
      <div className="wrap">
        <div className="van-head">
          <h2 id="kombi-h" className="display h-lg">{van.category === "car" ? d.car.about : t.about}</h2>
          <p className="caption">{t.yearOf(van.location, van.year)}</p>
        </div>
        {/* The photos are at the top of the page; without any, a drawing stands in here. */}
        {van.photos.length === 0 && <VanDrawing label={van.name} />}
        <dl className="grid-specs">
          <div><dt>{d.results.type}</dt><dd>{d.category[van.category ?? "passenger"]}</dd></div>
          {van.category === "cargo" && <div><dt>{d.cargo.space}</dt><dd>{van.cargoM3 ? d.cargo.m3(van.cargoM3) : "—"}</dd></div>}
          {van.category === "cargo" && <div><dt>{d.cargo.payload}</dt><dd>{van.payloadKg ? d.cargo.kg(van.payloadKg) : "—"}</dd></div>}
          <div><dt>{t.seats}</dt><dd>{van.seats}</dd></div>
          <div><dt>{t.fuel}</dt><dd>{d.fuels[van.fuel] ?? van.fuel}</dd></div>
          <div><dt>{t.gearbox}</dt><dd>{d.gearboxes[van.gearbox] ?? van.gearbox}</dd></div>
          <div><dt>{t.year}</dt><dd>{van.year}</dd></div>
          <div><dt>{t.license}</dt><dd>{van.license}</dd></div>
          {van.category !== "cargo" && <div><dt>{t.luggage}</dt><dd>{van.luggage || "—"}</dd></div>}
          <div><dt>{d.owner.label}</dt><dd>{van.owner || d.owner.platform}</dd></div>
          <div><dt>{t.engine}</dt><dd>{[van.engine, van.powerHp ? t.hp(van.powerHp) : ""].filter(Boolean).join(", ") || "—"}</dd></div>
        </dl>
        {van.features.length > 0 && (
          <ul className="feature-list" aria-label={t.equipment}>
            {van.features.map((f) => <li key={f}>{d.features[f] ?? f}</li>)}
          </ul>
        )}
        {van.description && <p className="lead van-desc">{van.description}</p>}
        <h3 className="van-map-h">{d.map.title}</h3>
        <VanMap city={van.location} car={van.category === "car"} />
      </div>
    </section>
  );
}

/** "PDV" in the included list only holds when the owner is in the VAT system. */
const isVat = (item: string) => /^\s*(pdv|vat)\s*$/i.test(item);

export function Prices({
  settings,
  included,
  vat,
  locale = "bs",
}: {
  settings: Settings;
  included: string[];
  /** The owner's VAT status; null/undefined when not known. */
  vat?: boolean | null;
  locale?: Locale;
}) {
  const t = dict(locale).prices;
  const items = vat === false ? included.filter((i) => !isVat(i)) : included;
  const weekly = Math.round(settings.dailyRate * (1 - settings.weeklyDiscountPct / 100));
  const extra = (e: Settings["extras"][number]) =>
    e.perDay !== undefined ? t.kmDay(e.perDay) : `${e.flat} KM`;
  return (
    <section id="cijene" className="section" aria-labelledby="cijene-h">
      <div className="wrap split">
        <div>
          <h2 id="cijene-h" className="display h-lg">
            {t.title}
          </h2>
          <p className="note">
            {settings.priceOnRequest ? t.noteOnRequest : t.note}
          </p>
        </div>
        <div className="tariffs">
          <div>
            <h3>{t.rental}</h3>
            {settings.priceOnRequest ? (
              <div className="line"><span>{t.rentalPrice}</span><span className="fill" /><b>{dict(locale).onRequest}</b></div>
            ) : (
              <>
            <div className="line"><span>{t.short}</span><span className="fill" /><b>{t.kmDay(settings.dailyRate)}</b></div>
            <div className="line"><span>{t.week(settings.weeklyDiscountPct)}</span><span className="fill" /><b>{t.kmDay(weekly)}</b></div>
            {settings.seasons.map((s) => (
              <div className="line" key={s.name}>
                <span>
                  {ownerText(s.name, locale)} ({s.from.split("-").reverse().join(".")}.–{s.to.split("-").reverse().join(".")}.)
                </span>
                <span className="fill" />
                <b>{t.kmDay(s.dailyRate)}</b>
              </div>
            ))}
              </>
            )}
            <div className="line"><span>{t.deposit}</span><span className="fill" /><b>{km(settings.deposit)}</b></div>
          </div>
          <div>
            <h3>{t.extras}</h3>
            {settings.extras
              .filter((e) => e.enabled)
              .map((e) => (
                <div className="line" key={e.id}><span>{ownerText(e.label, locale)}</span><span className="fill" /><b>{extra(e)}</b></div>
              ))}
            {settings.pickup
              .filter((p) => p.enabled && p.fee > 0)
              .map((p) => (
                <div className="line" key={p.id}><span>{ownerText(p.label, locale)}</span><span className="fill" /><b>{p.fee} KM</b></div>
              ))}
          </div>
          {items.length > 0 && <p className="included">{t.included}: {items.map((i) => ownerText(i, locale)).join(", ")}</p>}
          {vat != null && <p className="included">{vat ? t.vatIn : t.vatOut}</p>}
        </div>
      </div>
    </section>
  );
}

/** A van's rental terms, as its owner set them. */
export function Rules({
  terms,
  settings,
  limits = {},
  locale = "bs",
}: {
  terms: Terms;
  settings: Settings;
  limits?: VanLimits;
  locale?: Locale;
}) {
  const t = dict(locale).rules;
  const rules: [string, string][] = [
    [t.driver, t.driverText(terms.minDriverAge, terms.minLicenseYears)],
    [t.documents, ownerText(terms.documents, locale)],
    [t.mileage, limits.kmPerDay !== undefined ? t.mileageText(limits.kmPerDay) : ""],
    [t.extraKm, limits.kmPerDay && limits.extraKm ? limits.extraKm.split("\n").map((l) => l.trim()).filter(Boolean).join("; ") + "." : ""],
    [t.kasko, terms.kasko ? (t.kaskoText[terms.kasko] ?? "") : ""],
    [t.damage, limits.damageFee ? t.damageText(km(limits.damageFee)) : ""],
    [t.fuel, ownerText(terms.fuel, locale)],
    [t.border, ownerText(terms.border, locale)],
    [t.deposit, t.depositText(km(settings.deposit))],
    [t.cancel, terms.cancellationDays ? t.cancelDays(terms.cancellationDays) : t.cancelDay],
  ];
  if (terms.notes) rules.push([t.other, terms.notes]);
  return (
    <section id="uslovi" className="section" aria-labelledby="uslovi-h">
      <div className="wrap split">
        <h2 id="uslovi-h" className="display h-lg">
          {t.title[0]}
          <br />
          {t.title[1]}
        </h2>
        <ul className="rules">
          {rules
            .filter(([, d]) => d)
            .map(([t, d]) => (
              <li key={t}>
                <strong>{t}</strong>
                <p>{d}</p>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}

/** Stars as text, for screen readers too: "★★★★☆". */
export function Stars({ rating, label }: { rating: number; label: string }) {
  const full = Math.round(rating);
  return (
    <span className="stars" role="img" aria-label={label}>
      {"★".repeat(full)}
      <span aria-hidden="true">{"★".repeat(5 - full)}</span>
    </span>
  );
}

/** Ratings from customers who really rented this vehicle. Nothing is shown until the first one. */
export function Reviews({ reviews, locale = "bs" }: { reviews?: ReviewSummary; locale?: Locale }) {
  if (!reviews?.count) return null;
  const t = dict(locale).reviews;
  const avg = reviews.average.toLocaleString(locale === "en" ? "en-GB" : "bs-BA", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const date = (iso: string) => iso.split("-").reverse().join(".") + ".";
  return (
    <section id="ocjene" className="section" aria-labelledby="ocjene-h">
      <div className="wrap split">
        <div>
          <h2 id="ocjene-h" className="display h-lg">
            {t.title[0]}
            <br />
            {t.title[1]}
          </h2>
          <p className="review-score">
            <Stars rating={reviews.average} label={t.stars(reviews.average)} /> {t.summary(avg, reviews.count)}
          </p>
          <p className="note">{t.verified}</p>
        </div>
        <ul className="review-list">
          {reviews.items.map((r, i) => (
            <li key={i}>
              <div className="review-head">
                <Stars rating={r.rating} label={t.stars(r.rating)} />
                <strong>{r.name}</strong>
                <span className="caption">{date(r.date)}</span>
              </div>
              {r.comment && <p>{r.comment}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Faq({ locale = "bs" }: { locale?: Locale }) {
  const t = dict(locale).faq;
  return (
    <section id="pitanja" className="section" aria-labelledby="pitanja-h">
      <div className="wrap split">
        <h2 id="pitanja-h" className="display h-lg">
          {t.title}
        </h2>
        <div className="faq">
          {t.items.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** For van owners: what each package allows, and how to start. */
export function Plans({ locale = "bs" }: { locale?: Locale }) {
  const t = dict(locale).plans;
  return (
    <section id="paketi" className="section" aria-labelledby="paketi-h">
      <div className="wrap plans-section">
        <div className="plans-intro">
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 id="paketi-h" className="display h-lg">
            {t.title}<span className="dot">?</span>
          </h2>
          <p className="lead">{t.lead}</p>
          <Link className="btn-ghost" href="/admin?registracija" style={{ marginTop: 20 }}>{t.publish}</Link>
        </div>
        <div className="plans-basics">
          <span>{t.basicsTitle}</span>
          <ul>
            {t.basics.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
        <p className="plans-trial">{t.trial(FREE_TRIAL_DAYS)}</p>
        <PlanList locale={locale} />
        <p className="caption plans-foot">
          {t.footBefore} <a href={`mailto:${SITE.email}`}>{SITE.email}</a> {t.footAfter}
        </p>
      </div>
    </section>
  );
}

export function Contact({ locale = "bs" }: { locale?: Locale }) {
  const t = dict(locale).contact;
  return (
    <section id="kontakt" className="contact" aria-labelledby="kontakt-h">
      <div className="wrap">
        <h2 id="kontakt-h" className="display">
          {t.title[0]}
          <br />
          {t.title[1]}
        </h2>
        <div className="chips">
          <a className="chip" href={`mailto:${SITE.email}`}>{t.email}</a>
        </div>
      </div>
    </section>
  );
}

/** Everything below the van list, shared by the homepage and landing pages. */
export function PageBody({ locale = "bs" }: { locale?: Locale }) {
  return (
    <>
      <Plans locale={locale} />
      <Contact locale={locale} />
    </>
  );
}
