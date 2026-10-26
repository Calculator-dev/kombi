"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  bookingRequestSchema,
  dayWord,
  findPickup,
  quote,
  type ContactChannel,
  type PublicVan,
} from "@kombi/shared";
import { ApiError, api } from "@/lib/api";
import { km, shortDate } from "@/lib/format";
import { SITE } from "@/lib/site";
import { Logo } from "./Header";

const TIMES = Array.from({ length: 13 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`);
const PLACEHOLDERS: Record<string, string> = { address: "Ulica i broj, Sarajevo", airport: "npr. TK 1021" };
const tag = (i: number) => String.fromCharCode(65 + i); // A, B, C…
const STEPS = ["Dodaci", "Vozač", "Potvrda"];

interface Props {
  van: PublicVan;
  start: string;
  end: string;
}

interface Form {
  pickupAddress: string;
  pickupTime: string;
  returnTime: string;
  name: string;
  email: string;
  phone: string;
  contactChannel: ContactChannel;
  birthDate: string;
  licenseSince: string;
  notes: string;
  acceptTerms: boolean;
  website: string;
}

export function BookingFlow({ van, start, end }: Props) {
  const settings = van.pricing;
  const [step, setStep] = useState(1);
  const [extras, setExtras] = useState<string[]>([]);
  const [pickup, setPickup] = useState<string>(() => settings.pickup.find((p) => p.enabled)?.id ?? "");
  const [form, setForm] = useState<Form>({
    pickupAddress: "",
    pickupTime: "12:00",
    returnTime: "12:00",
    name: "",
    email: "",
    phone: "",
    contactChannel: "viber",
    birthDate: "",
    licenseSince: "",
    notes: "",
    acceptTerms: false,
    website: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<{ message: string; taken?: boolean } | null>(null);
  const [sending, setSending] = useState(false);
  // The API can take a while to wake up; after a few seconds, say so.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!sending) return setSlow(false);
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, [sending]);
  const [done, setDone] = useState<{ ref: string; total: number } | null>(null);

  const q = quote({ start, end, extras, pickup }, settings);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const pickupDetails = findPickup(settings, pickup)?.detailsLabel ?? "";
  const toggle = (id: string) => setExtras((x) => (x.includes(id) ? x.filter((e) => e !== id) : [...x, id]));

  function payload() {
    return {
      vanId: van.id,
      start,
      end,
      extras,
      pickup,
      pickupAddress: pickupDetails ? form.pickupAddress : undefined,
      pickupTime: form.pickupTime,
      returnTime: form.returnTime,
      name: form.name,
      email: form.email,
      phone: form.phone,
      contactChannel: form.contactChannel,
      birthDate: form.birthDate || undefined,
      licenseSince: form.licenseSince ? Number(form.licenseSince) : undefined,
      notes: form.notes || undefined,
      acceptTerms: form.acceptTerms,
      website: form.website || undefined,
    };
  }

  function validate(fields: string[]) {
    const r = bookingRequestSchema(settings).safeParse(payload());
    const errs: Record<string, string> = {};
    if (!r.success) for (const i of r.error.issues) {
      const k = String(i.path[0] ?? "_");
      if (fields.includes(k) && !errs[k]) errs[k] = i.message;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function next() {
    setFailure(null);
    if (step === 1) {
      if (validate(["pickupAddress"])) setStep(2);
      return;
    }
    if (!validate(["name", "email", "phone", "birthDate", "licenseSince", "notes", "acceptTerms"])) return;
    setSending(true);
    try {
      const res = await api<{ ref: string; total: number }>("/bookings", { method: "POST", json: payload() });
      setDone(res);
      setStep(3);
      window.scrollTo({ top: 0 });
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fields);
        setFailure({ message: e.message, taken: e.code === "dates_taken" });
      } else {
        setFailure({ message: "Nema veze sa serverom. Provjerite internet i pokušajte ponovo." });
      }
    } finally {
      setSending(false);
    }
  }

  const field = (name: keyof Form, label: string, input: React.ReactNode) => (
    <label className="field" data-invalid={Boolean(errors[name])}>
      {label}
      {input}
      {errors[name] && <span className="field-error">{errors[name]}</span>}
    </label>
  );

  return (
    <>
      <header className="header">
        <div className="wrap">
          <Logo />
          <ol className="steps" aria-label="Koraci rezervacije">
            {STEPS.map((label, i) => (
              <li
                key={label}
                data-state={step === i + 1 ? "current" : step > i + 1 ? "done" : "todo"}
                aria-current={step === i + 1 ? "step" : undefined}
              >
                {i + 1}. {label}
              </li>
            ))}
          </ol>
        </div>
      </header>

      <div className="wrap flow">
        <main id="sadrzaj">
          {step === 1 && (
            <>
              <div>
                <h1 className="display h-lg" style={{ marginBottom: 20 }}>
                  Dodaci
                </h1>
                <div className="extras">
                  {settings.extras.filter((e) => e.enabled).map((e) => {
                    const on = extras.includes(e.id);
                    return (
                      <button key={e.id} type="button" className="extra" aria-pressed={on} onClick={() => toggle(e.id)}>
                        <span className="box" aria-hidden="true">{on ? "✕" : ""}</span>
                        <span className="name">{e.label}</span>
                        <span className="price">{e.perDay !== undefined ? `+${e.perDay} KM/dan` : `+${e.flat} KM`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="display h-md" style={{ marginBottom: 20 }}>
                  Preuzimanje
                  <br />
                  po dogovoru
                </h2>
                <div className="places" role="radiogroup" aria-label="Mjesto preuzimanja">
                  {settings.pickup
                    .filter((p) => p.enabled)
                    .map((p, i) => {
                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="radio"
                          aria-checked={pickup === p.id}
                          className="place"
                          onClick={() => setPickup(p.id)}
                        >
                          <span className="tag">{tag(i)}</span>
                          <span className="name">{p.label}</span>
                          <span className="price">{p.fee ? `+${p.fee} KM` : "Besplatno"}</span>
                        </button>
                      );
                    })}
                </div>
                <div className="fields" style={{ marginTop: 24 }}>
                  {pickupDetails &&
                    field(
                      "pickupAddress",
                      pickupDetails,
                      <input
                        value={form.pickupAddress}
                        onChange={(e) => set("pickupAddress", e.target.value)}
                        placeholder={PLACEHOLDERS[pickup]}
                      />,
                    )}
                  {field(
                    "pickupTime",
                    "Okvirno vrijeme preuzimanja",
                    <select value={form.pickupTime} onChange={(e) => set("pickupTime", e.target.value)}>
                      {TIMES.map((t) => <option key={t}>{t}</option>)}
                    </select>,
                  )}
                  {field(
                    "returnTime",
                    "Okvirno vrijeme povratka",
                    <select value={form.returnTime} onChange={(e) => set("returnTime", e.target.value)}>
                      {TIMES.map((t) => <option key={t}>{t}</option>)}
                    </select>,
                  )}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="display h-lg">Ko vozi?</h1>
              <div className="fields">
                {field("name", "Ime i prezime", <input autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} />)}
                {field("email", "Email", <input type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />)}
                {field("phone", "Telefon (Viber / WhatsApp)", <input type="tel" autoComplete="tel" placeholder="+387" value={form.phone} onChange={(e) => set("phone", e.target.value)} />)}
                {field(
                  "contactChannel",
                  "Javite mi se na",
                  <select value={form.contactChannel} onChange={(e) => set("contactChannel", e.target.value as ContactChannel)}>
                    <option value="viber">Viber</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="phone">Poziv</option>
                  </select>,
                )}
                {field("birthDate", "Datum rođenja vozača", <input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />)}
                {field("licenseSince", "Vozačka dozvola od (godina)", <input inputMode="numeric" placeholder="2015" value={form.licenseSince} onChange={(e) => set("licenseSince", e.target.value.replace(/\D/g, "").slice(0, 4))} />)}
              </div>
              {field("notes", "Napomena: odredište, broj putnika", <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />)}
              <div className="hp" aria-hidden="true">
                <label>
                  Website
                  <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
                </label>
              </div>
              <div>
                <label className="check">
                  <input type="checkbox" checked={form.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)} />
                  <span>
                    Prihvatam <Link href={`/kombi/${van.slug}#uslovi`} target="_blank">uslove najma</Link> za ovaj kombi.
                  </span>
                </label>
                {errors.acceptTerms && <span className="field-error">{errors.acceptTerms}</span>}
              </div>
            </>
          )}

          {step === 3 && done && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <p className="mono" style={{ margin: 0 }}>
                Upit {done.ref}, {km(done.total)}
              </p>
              <h1 className="display h-xl">
                Termin je
                <br />
                vaš<span className="dot">.</span>
              </h1>
              <p className="lead">
                Čuvamo ga dok ga ne potvrdimo. Potvrdu i dogovor oko preuzimanja šaljemo na {form.contactChannel === "email" ? "email" : form.contactChannel === "phone" ? "telefon" : form.contactChannel === "viber" ? "Viber" : "WhatsApp"} u roku od {SITE.replyWithin}.
              </p>
              <Link className="btn-ghost" href="/" style={{ alignSelf: "flex-start" }}>
                Nazad na početnu
              </Link>
            </div>
          )}

          {failure && (
            <p className="alert" role="alert">
              {failure.message}{" "}
              {failure.taken && <Link href={`/kombi/${van.slug}#rezervacija`}>Odaberite druge datume</Link>}
            </p>
          )}

          {step < 3 && (
            <div className="actions">
              {step === 1 ? (
                <Link className="btn-ghost" href={`/kombi/${van.slug}?start=${start}&end=${end}#rezervacija`}>Promijeni datume</Link>
              ) : (
                <button type="button" className="btn-ghost" onClick={() => setStep(1)}>Nazad</button>
              )}
              <button
                type="button"
                className="btn-dark"
                onClick={next}
                disabled={sending || q.errors.length > 0}
                aria-busy={sending}
              >
                {sending && <span className="spinner" aria-hidden="true" />}
                {step === 1 ? "Dalje" : sending ? "Šaljem…" : "Pošalji upit"}
              </button>
            </div>
          )}
          {sending && slow && (
            <p className="slow-note" role="status">Šaljemo upit, ovo može potrajati do minute. Ne zatvarajte stranicu.</p>
          )}
        </main>

        <aside aria-label="Pregled rezervacije">
          <div className="t-head"><span>Vaš upit</span><span>Bez vozača</span></div>
          <div style={{ padding: 20, borderBottom: "1px dashed var(--dark-line)" }}>
            {van.photos[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="aside-photo" src={van.photos[0].thumbUrl} alt="" width={640} height={480} />
            )}
            <div className="display" style={{ fontSize: 40, lineHeight: 0.95 }}>{van.name}</div>
            <div className="mono" style={{ marginTop: 8, fontSize: 13, color: "var(--dark-muted)" }}>
              {[van.year, van.engine, van.fuel.toLowerCase(), van.gearbox.toLowerCase(), van.location].filter(Boolean).join(", ")}
            </div>
          </div>
          <div className="t-dates">
            <div><div className="t-label">Preuzimanje</div><div className="t-date">{shortDate(start)}</div></div>
            <div><div className="t-label">Povratak</div><div className="t-date">{shortDate(end)}</div></div>
          </div>
          <div className="receipt" style={{ borderTop: 0 }}>
            {q.errors.map((e) => <div key={e} className="line minus">{e}</div>)}
            {q.rentalLines.map((l) => (
              <div className="line" key={l.rate}><span>{l.label}</span><span className="fill" /><span>{km(l.amount)}</span></div>
            ))}
            {q.discount > 0 && (
              <div className="line minus"><span>Popust −{q.discountPct}%</span><span className="fill" /><span>−{km(q.discount)}</span></div>
            )}
            {q.extraLines.map((l) => (
              <div className="line" key={l.label}><span>{l.label}</span><span className="fill" /><span>{km(l.amount)}</span></div>
            ))}
            {q.pickupLine && (
              <div className="line"><span>{q.pickupLine.label}</span><span className="fill" /><span>{km(q.pickupLine.amount)}</span></div>
            )}
            <div className="line dim"><span>Depozit (vraća se)</span><span className="fill" /><span>{km(q.deposit)}</span></div>
          </div>
          <div className="t-foot">
            <div className="t-total">
              <span className="t-label">{q.days} {dayWord(q.days)}</span>
              <strong>{km(q.total)}</strong>
            </div>
          </div>
          <div className="aside-note">Plaćanje pri preuzimanju. Danas ništa.</div>
        </aside>
      </div>
    </>
  );
}
