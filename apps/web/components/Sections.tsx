import type { ReactNode } from "react";
import { featureLabel, type PublicVan, type Settings, type Terms } from "@kombi/shared";
import { km } from "@/lib/format";
import { FAQ, SITE } from "@/lib/site";
import { Gallery } from "./Gallery";
import { VanDrawing } from "./VanDrawing";

/** Title and intro on the left, the calendar ticket (passed in) on the right. */
export function Hero({
  title,
  intro,
  specs,
  children,
}: {
  title: ReactNode;
  intro: string;
  specs: [string, string][];
  children: ReactNode;
}) {
  return (
    <section aria-labelledby="hero-title">
      <div className="wrap hero-title">
        <h1 id="hero-title" className="display h-xl">
          {title}
        </h1>
      </div>
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="lead">{intro}</p>
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
export function VanDetails({ van }: { van: PublicVan }) {
  return (
    <section id="kombi" className="section" aria-labelledby="kombi-h">
      <div className="wrap">
        <div className="van-head">
          <h2 id="kombi-h" className="display h-lg">O kombiju</h2>
          <p className="caption">{van.location}, godište {van.year}</p>
        </div>
        {van.photos.length ? (
          <Gallery photos={van.photos} name={van.name} />
        ) : (
          <VanDrawing label={van.name} />
        )}
        <dl className="grid-specs">
          <div><dt>Sjedišta</dt><dd>{van.seats}</dd></div>
          <div><dt>Gorivo</dt><dd>{van.fuel}</dd></div>
          <div><dt>Mjenjač</dt><dd>{van.gearbox}</dd></div>
          <div><dt>Godište</dt><dd>{van.year}</dd></div>
          <div><dt>Dozvola</dt><dd>{van.license}</dd></div>
          <div><dt>Kofera</dt><dd>{van.luggage || "—"}</dd></div>
          <div><dt>Motor</dt><dd>{[van.engine, van.powerHp ? `${van.powerHp} KS` : ""].filter(Boolean).join(", ") || "—"}</dd></div>
        </dl>
        {van.features.length > 0 && (
          <ul className="feature-list" aria-label="Oprema">
            {van.features.map((f) => <li key={f}>{featureLabel(f)}</li>)}
          </ul>
        )}
        {van.description && <p className="lead van-desc">{van.description}</p>}
      </div>
    </section>
  );
}

export function Prices({ settings, included }: { settings: Settings; included: string[] }) {
  const weekly = Math.round(settings.dailyRate * (1 - settings.weeklyDiscountPct / 100));
  const extra = (e: Settings["extras"][number]) =>
    e.perDay !== undefined ? `${e.perDay} KM/dan` : `${e.flat} KM`;
  return (
    <section id="cijene" className="section" aria-labelledby="cijene-h">
      <div className="wrap split">
        <div>
          <h2 id="cijene-h" className="display h-lg">
            Cjenovnik
          </h2>
          <p className="note">Cijena koju vidite je cijena koju plaćate. Bez naknada koje se pojave na šalteru.</p>
        </div>
        <div className="tariffs">
          <div>
            <h3>Najam</h3>
            <div className="line"><span>1–6 dana</span><span className="fill" /><b>{settings.dailyRate} KM/dan</b></div>
            <div className="line"><span>7+ dana (−{settings.weeklyDiscountPct}%)</span><span className="fill" /><b>{weekly} KM/dan</b></div>
            {settings.seasons.map((s) => (
              <div className="line" key={s.name}>
                <span>
                  {s.name} ({s.from.split("-").reverse().join(".")}.–{s.to.split("-").reverse().join(".")}.)
                </span>
                <span className="fill" />
                <b>{s.dailyRate} KM/dan</b>
              </div>
            ))}
            <div className="line"><span>Depozit</span><span className="fill" /><b>{km(settings.deposit)}</b></div>
          </div>
          <div>
            <h3>Dodaci</h3>
            {settings.extras
              .filter((e) => e.enabled)
              .map((e) => (
                <div className="line" key={e.id}><span>{e.label}</span><span className="fill" /><b>{extra(e)}</b></div>
              ))}
            {settings.pickup
              .filter((p) => p.enabled && p.fee > 0)
              .map((p) => (
                <div className="line" key={p.id}><span>{p.label}</span><span className="fill" /><b>{p.fee} KM</b></div>
              ))}
          </div>
          {included.length > 0 && <p className="included">Uključeno: {included.join(", ")}</p>}
        </div>
      </div>
    </section>
  );
}

/** A van's rental terms, as its owner set them. */
export function Rules({ terms, settings }: { terms: Terms; settings: Settings }) {
  const years = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "godinu" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "godine" : "godina"}`;
  const rules: [string, string][] = [
    [
      "Vozač",
      `Najmanje ${years(terms.minDriverAge)}${terms.minLicenseYears ? ` i ${years(terms.minLicenseYears)} vozačke dozvole` : ""}.`,
    ],
    ["Dokumenti", terms.documents],
    ["Gorivo", terms.fuel],
    ["Granica", terms.border],
    ["Depozit", `${km(settings.deposit)}, plaća se pri preuzimanju i vraća pri povratku.`],
    [
      "Otkazivanje",
      terms.cancellationDays ? `Besplatno do ${terms.cancellationDays} dana prije preuzimanja.` : "Besplatno do dana prije preuzimanja.",
    ],
  ];
  if (terms.notes) rules.push(["Ostalo", terms.notes]);
  return (
    <section id="uslovi" className="section" aria-labelledby="uslovi-h">
      <div className="wrap split">
        <h2 id="uslovi-h" className="display h-lg">
          Uslovi
          <br />
          najma
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

export function Faq() {
  return (
    <section id="pitanja" className="section" aria-labelledby="pitanja-h">
      <div className="wrap split">
        <h2 id="pitanja-h" className="display h-lg">
          Pitanja
        </h2>
        <div className="faq">
          {FAQ.map((f) => (
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

export function Reviews() {
  return (
    <section className="section" aria-labelledby="rec-h">
      <div className="wrap split" style={{ alignItems: "center" }}>
        <h2 id="rec-h" className="display h-md">
          Šta kažu putnici
        </h2>
        <p className="placeholder-box">[Ovdje idu Google recenzije nakon prvih najmova]</p>
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <section id="kontakt" className="contact" aria-labelledby="kontakt-h">
      <div className="wrap">
        <h2 id="kontakt-h" className="display">
          Pitanje?
          <br />
          Piši na Viber.
        </h2>
        <div className="chips">
          <a className="chip" href={SITE.viberHref}>Viber</a>
          <a className="chip" href={SITE.whatsappHref}>WhatsApp</a>
          <a className="chip ghost" href={SITE.phoneHref}>Pozovi</a>
        </div>
      </div>
    </section>
  );
}

/** Everything below the van list, shared by the homepage and landing pages. */
export function PageBody() {
  return (
    <>
      <Faq />
      <Reviews />
      <Contact />
    </>
  );
}
