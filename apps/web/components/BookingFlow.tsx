"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  bookingRequestSchema,
  findPickup,
  quote,
  type ContactChannel,
  type PublicVan,
} from "@kombi/shared";
import { ApiError, api } from "@/lib/api";
import { track, trackEcommerce } from "@/lib/analytics";
import { km, shortDate } from "@/lib/format";
import { ownerText, translateQuoteError, translateRentalLine } from "@/lib/i18n";
import { useLocale } from "@/lib/useLocale";
import { Logo } from "./Header";
import { ThemeToggle } from "./ThemeToggle";

const TIMES = Array.from({ length: 13 }, (_, i) => `${String(8 + i).padStart(2, "0")}:00`);
const tag = (i: number) => String.fromCharCode(65 + i); // A, B, C…

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
  address: string;
  jmb: string;
  idNumber: string;
  licenseNumber: string;
  notes: string;
  acceptTerms: boolean;
  website: string;
}

export function BookingFlow({ van, start, end }: Props) {
  const settings = van.pricing;
  const { locale, t: d, lp } = useLocale();
  const t = d.booking;
  const dayWord = d.days;
  const ON_REQUEST = d.onRequest;
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
    address: "",
    jmb: "",
    idNumber: "",
    licenseNumber: "",
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
  // Counted for the owner's analytics: someone picked dates and opened the form.
  useEffect(() => {
    void api(`/vans/${van.slug}/hit`, { method: "POST", json: { type: "checkout" } }).catch(() => {});
  }, [van.slug]);

  const q = quote({ start, end, extras, pickup }, settings);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const pickupDetails = findPickup(settings, pickup)?.detailsLabel ?? "";
  const own = (text: string) => ownerText(text, locale);
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
      address: form.address || undefined,
      jmb: form.jmb || undefined,
      idNumber: form.idNumber || undefined,
      licenseNumber: form.licenseNumber || undefined,
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
      if (fields.includes(k) && !errs[k]) errs[k] = t.fieldErrors?.[k] ?? i.message;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function next() {
    setFailure(null);
    if (step === 1) {
      if (validate(["pickupAddress"])) {
        setStep(2);
        track("checkout_progress", { checkout_step: 2, item_id: van.slug, extras: extras.join(","), pickup, value: q.total });
      }
      return;
    }
    if (!validate(["name", "email", "phone", "birthDate", "licenseSince", "address", "jmb", "idNumber", "licenseNumber", "notes", "acceptTerms"])) return;
    setSending(true);
    try {
      const res = await api<{ ref: string; total: number }>("/bookings", { method: "POST", json: payload() });
      setDone(res);
      setStep(3);
      // A request, not a payment: GA4's "generate_lead". The booking number is not personal data.
      trackEcommerce("generate_lead", [{ ...van, dailyRate: van.pricing.dailyRate }], {
        value: res.total,
        prices: [res.total],
        transaction_id: res.ref,
        start_date: start,
        end_date: end,
        days: q.days,
        contact_channel: form.contactChannel,
      });
      window.scrollTo({ top: 0 });
    } catch (e) {
      track("booking_error", { item_id: van.slug, error_code: e instanceof ApiError ? e.code : "network" });
      if (e instanceof ApiError) {
        setErrors(t.fieldErrors ? Object.fromEntries(Object.keys(e.fields).map((k) => [k, t.fieldErrors![k] ?? e.fields[k]!])) : e.fields);
        const taken = e.code === "dates_taken";
        // The API answers in Bosnian; English visitors get the gist.
        const message =
          locale === "bs" ? e.message : taken ? "Someone has just booked these dates." : "The request couldn't be sent. Check the form and try again.";
        setFailure({ message, taken });
      } else {
        setFailure({ message: t.noServer });
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
          <Logo href={lp("/")} label={d.header.home} />
          <ThemeToggle label={d.header.theme} />
          <ol className="steps" aria-label={t.stepsLabel}>
            {t.steps.map((label, i) => (
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
                  {t.extras}
                </h1>
                <div className="extras">
                  {settings.extras.filter((e) => e.enabled).map((e) => {
                    const on = extras.includes(e.id);
                    return (
                      <button key={e.id} type="button" className="extra" aria-pressed={on} onClick={() => toggle(e.id)}>
                        <span className="box" aria-hidden="true">{on ? "✕" : ""}</span>
                        <span className="name">{own(e.label)}</span>
                        <span className="price">{e.perDay !== undefined ? `+${e.perDay} ${t.perDay}` : `+${e.flat} KM`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="display h-md" style={{ marginBottom: 20 }}>
                  {t.pickupTitle[0]}
                  <br />
                  {t.pickupTitle[1]}
                </h2>
                <div className="places" role="radiogroup" aria-label={t.pickupPlace}>
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
                          <span className="name">{own(p.label)}</span>
                          <span className="price">{p.fee ? `+${p.fee} KM` : t.free}</span>
                        </button>
                      );
                    })}
                </div>
                <div className="fields" style={{ marginTop: 24 }}>
                  {pickupDetails &&
                    field(
                      "pickupAddress",
                      own(pickupDetails),
                      <input
                        value={form.pickupAddress}
                        onChange={(e) => set("pickupAddress", e.target.value)}
                        placeholder={t.placeholders[pickup]}
                      />,
                    )}
                  {field(
                    "pickupTime",
                    t.pickupTime,
                    <select value={form.pickupTime} onChange={(e) => set("pickupTime", e.target.value)}>
                      {TIMES.map((t) => <option key={t}>{t}</option>)}
                    </select>,
                  )}
                  {field(
                    "returnTime",
                    t.returnTime,
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
              <h1 className="display h-lg">{t.who}</h1>
              <div className="fields">
                {field("name", t.name, <input autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} />)}
                {field("email", t.email, <input type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />)}
                {field("phone", t.phone, <input type="tel" autoComplete="tel" placeholder="+387" value={form.phone} onChange={(e) => set("phone", e.target.value)} />)}
                {field(
                  "contactChannel",
                  t.channel,
                  <select value={form.contactChannel} onChange={(e) => set("contactChannel", e.target.value as ContactChannel)}>
                    <option value="viber">Viber</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="phone">{t.call}</option>
                  </select>,
                )}
                {field("birthDate", t.birthDate, <input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} />)}
                {field("licenseSince", t.licenseSince, <input inputMode="numeric" placeholder="2015" value={form.licenseSince} onChange={(e) => set("licenseSince", e.target.value.replace(/\D/g, "").slice(0, 4))} />)}
              </div>
              <div>
                <h2 className="display h-md" style={{ marginBottom: 6 }}>{t.contractTitle}</h2>
                <p style={{ margin: "0 0 16px", fontSize: 15, color: "var(--muted)" }}>
                  {t.contractNote}
                </p>
                <div className="fields">
                  {field("address", t.address, <input autoComplete="street-address" value={form.address} onChange={(e) => set("address", e.target.value)} />)}
                  {field("jmb", t.jmb, <input inputMode="numeric" autoComplete="off" value={form.jmb} onChange={(e) => set("jmb", e.target.value.replace(/\D/g, "").slice(0, 13))} />)}
                  {field("idNumber", t.idNumber, <input autoComplete="off" value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} />)}
                  {field("licenseNumber", t.licenseNumber, <input autoComplete="off" value={form.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} />)}
                </div>
              </div>
              {field("notes", t.notes, <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />)}
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
                    {t.acceptBefore} <Link href={lp(`/kombi/${van.slug}#uslovi`)} target="_blank">{t.acceptLink}</Link> {t.acceptAfter}
                  </span>
                </label>
                {errors.acceptTerms && <span className="field-error">{errors.acceptTerms}</span>}
              </div>
            </>
          )}

          {step === 3 && done && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <p className="mono" style={{ margin: 0 }}>
                {t.doneRef(done.ref, q.onRequest ? t.priceOnRequest : km(done.total))}
              </p>
              <h1 className="display h-xl">
                {t.doneTitle[0]}
                <br />
                {t.doneTitle[1]}<span className="dot">.</span>
              </h1>
              <p className="lead">
                {t.doneText(t.channels[form.contactChannel] ?? form.contactChannel, t.replyWithin)}
              </p>
              <Link className="btn-ghost" href={lp("/")} style={{ alignSelf: "flex-start" }}>
                {t.backHome}
              </Link>
            </div>
          )}

          {failure && (
            <p className="alert" role="alert">
              {failure.message}{" "}
              {failure.taken && <Link href={lp(`/kombi/${van.slug}#rezervacija`)}>{t.otherDates}</Link>}
            </p>
          )}

          {step === 2 && (
            <p className="field-note">
              {t.privacyBefore}{" "}
              <Link href={lp("/privatnost")} target="_blank">{t.privacyLink}</Link>.
            </p>
          )}

          {step < 3 && (
            <div className="actions">
              {step === 1 ? (
                <Link className="btn-ghost" href={lp(`/kombi/${van.slug}?start=${start}&end=${end}#rezervacija`)}>{t.changeDates}</Link>
              ) : (
                <button type="button" className="btn-ghost" onClick={() => setStep(1)}>{t.back}</button>
              )}
              <button
                type="button"
                className="btn-dark"
                onClick={next}
                disabled={sending || q.errors.length > 0}
                aria-busy={sending}
              >
                {sending && <span className="spinner" aria-hidden="true" />}
                {step === 1 ? t.next : sending ? t.sending : t.send}
              </button>
            </div>
          )}
          {sending && slow && (
            <p className="slow-note" role="status">{t.slow}</p>
          )}
        </main>

        <aside aria-label={t.summary}>
          <div className="t-head"><span>{t.yourRequest}</span><span>{d.ticket.noDriver}</span></div>
          <div style={{ padding: "4px 20px 16px" }}>
            {van.photos[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="aside-photo" src={van.photos[0].thumbUrl} alt="" width={640} height={480} />
            )}
            <div className="display">{van.name}</div>
            <div className="mono" style={{ marginTop: 4, fontSize: 14, color: "var(--muted)" }}>
              {[van.year, van.engine, (d.fuels[van.fuel] ?? van.fuel).toLowerCase(), (d.gearboxes[van.gearbox] ?? van.gearbox).toLowerCase(), van.location].filter(Boolean).join(", ")}
            </div>
          </div>
          <div className="t-dates">
            <div><div className="t-label">{d.ticket.pickup}</div><div className="t-date">{shortDate(start, locale)}</div></div>
            <div><div className="t-label">{d.ticket.return}</div><div className="t-date">{shortDate(end, locale)}</div></div>
          </div>
          <div className="receipt" style={{ borderTop: 0 }}>
            {q.errors.map((e) => <div key={e} className="line minus">{translateQuoteError(e, locale)}</div>)}
            {q.onRequest && (
              <div className="line"><span>{t.rental}, {q.days} {dayWord(q.days)}</span><span className="fill" /><span>{ON_REQUEST}</span></div>
            )}
            {q.rentalLines.map((l) => (
              <div className="line" key={l.rate}><span>{translateRentalLine(l.label, locale)}</span><span className="fill" /><span>{km(l.amount)}</span></div>
            ))}
            {q.discount > 0 && (
              <div className="line minus"><span>{t.discount(q.discountPct)}</span><span className="fill" /><span>−{km(q.discount)}</span></div>
            )}
            {q.extraLines.map((l) => (
              <div className="line" key={l.label}><span>{own(l.label)}</span><span className="fill" /><span>{km(l.amount)}</span></div>
            ))}
            {q.pickupLine && (
              <div className="line"><span>{own(q.pickupLine.label)}</span><span className="fill" /><span>{km(q.pickupLine.amount)}</span></div>
            )}
            <div className="line dim"><span>{t.deposit}</span><span className="fill" /><span>{km(q.deposit)}</span></div>
          </div>
          <div className="t-foot price-bar">
            <div className="t-total">
              <span className="t-label">{q.onRequest ? t.price : t.total}, {q.days} {dayWord(q.days)}</span>
              <strong>{q.onRequest ? ON_REQUEST : km(q.total)}</strong>
            </div>
          </div>
          <div className="aside-note">{q.onRequest ? t.noteOnRequest : t.note}</div>
        </aside>
      </div>
    </>
  );
}
