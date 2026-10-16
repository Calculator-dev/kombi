import type { ReactNode } from "react";
import type { Settings } from "@kombi/shared";
import { km } from "@/lib/format";
import { DESTINATIONS, FAQ, SITE, VAN } from "@/lib/site";
import { BookingWidget } from "./BookingWidget";
import { VanDrawing } from "./VanDrawing";

export function Hero({ title, intro, settings }: { title: ReactNode; intro: string; settings: Settings }) {
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
            <div><dt>Model</dt><dd>{VAN.name}</dd></div>
            <div><dt>Od</dt><dd>{settings.dailyRate} KM / dan</dd></div>
            <div><dt>Preuzimanje</dt><dd>Po dogovoru</dd></div>
            <div><dt>Plaćanje</dt><dd>Pri preuzimanju</dd></div>
            <div><dt>Granica</dt><dd>Hrvatska, Crna Gora, Srbija</dd></div>
          </dl>
        </div>
        <BookingWidget settings={settings} />
      </div>
    </section>
  );
}

export function VanSection() {
  return (
    <section id="kombi" className="section" aria-labelledby="kombi-h">
      <div className="wrap">
        <div className="van-head">
          <h2 id="kombi-h" className="display h-lg">
            {VAN.name}
            <br />
            8+1
          </h2>
          <p className="caption">Bočni profil, godište {VAN.year}</p>
        </div>
        <VanDrawing />
        <dl className="grid-specs">
          <div><dt>Sjedišta</dt><dd>{VAN.seats}</dd></div>
          <div><dt>Gorivo</dt><dd>{VAN.fuel}</dd></div>
          <div><dt>Motor</dt><dd>{VAN.engine}</dd></div>
          <div><dt>Mjenjač</dt><dd>{VAN.gearbox}</dd></div>
          <div><dt>Godište</dt><dd>{VAN.year}</dd></div>
          <div><dt>Dozvola</dt><dd>{VAN.license}</dd></div>
        </dl>
        {/* Replace with real photos: put files in /public/van and use next/image. */}
        <div className="photos">
          <div className="photo">[Foto] Eksterijer</div>
          <div className="photo">[Foto] Sjedišta</div>
          <div className="photo">[Foto] Prtljažnik</div>
        </div>
      </div>
    </section>
  );
}

export function Destinations() {
  return (
    <section className="dest" aria-labelledby="dest-h">
      <div className="wrap">
        <h2 id="dest-h" className="display h-md">
          Gdje ćete
          <br />
          ovaj put?
        </h2>
        <ul>
          {DESTINATIONS.map(([place, dist]) => (
            <li key={place}>
              {place}
              <span>{dist}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Prices({ settings }: { settings: Settings }) {
  const weekly = Math.round(settings.dailyRate * (1 - settings.weeklyDiscountPct / 100));
  const extra = (e: Settings["extras"][keyof Settings["extras"]]) =>
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
            {Object.values(settings.extras)
              .filter((e) => e.enabled)
              .map((e) => (
                <div className="line" key={e.label}><span>{e.label}</span><span className="fill" /><b>{extra(e)}</b></div>
              ))}
            {Object.values(settings.pickup)
              .filter((p) => p.enabled && p.fee > 0)
              .map((p) => (
                <div className="line" key={p.label}><span>{p.label}</span><span className="fill" /><b>{p.fee} KM</b></div>
              ))}
          </div>
          <p className="included">Uključeno: {SITE.included.join(", ")}</p>
        </div>
      </div>
    </section>
  );
}

export function Rules({ settings }: { settings: Settings }) {
  const rules: [string, string][] = [
    ["Vozač", `Najmanje ${SITE.minDriverAge} godina i ${SITE.minLicenseYears} godine vozačke B kategorije.`],
    ["Dokumenti", "Lična karta ili pasoš i vozačka dozvola."],
    ["Gorivo", "Preuzimate pun rezervoar, vraćate pun rezervoar."],
    ["Granica", "Najavite u upitu, pripremamo zeleni karton."],
    ["Depozit", `${km(settings.deposit)} pri preuzimanju, vraća se pri povratku.`],
    ["Otkazivanje", `Besplatno do ${SITE.cancellationDays} dana prije preuzimanja.`],
  ];
  return (
    <section id="uslovi" className="section" aria-labelledby="uslovi-h">
      <div className="wrap split">
        <h2 id="uslovi-h" className="display h-lg">
          Uslovi
          <br />
          najma
        </h2>
        <ul className="rules">
          {rules.map(([t, d]) => (
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

/** Everything below the hero, shared by the homepage and landing pages. */
export function PageBody({ settings }: { settings: Settings }) {
  return (
    <>
      <VanSection />
      <Destinations />
      <Prices settings={settings} />
      <Rules settings={settings} />
      <Faq />
      <Reviews />
      <Contact />
    </>
  );
}
