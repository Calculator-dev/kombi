"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  eachDate,
  kmToEur,
  quote,
  todayIn,
  type Availability,
  type Category,
  type IsoDate,
  type Settings,
} from "@kombi/shared";
import { api } from "@/lib/api";
import { trackEcommerce, type TrackedVan } from "@/lib/analytics";
import { km, shortDate } from "@/lib/format";
import { translateQuoteError, translateRentalLine } from "@/lib/i18n";
import { useLocale } from "@/lib/useLocale";

interface Props {
  /** With a van: its free days and exact price. Without: pick dates to search all vans. */
  van?: Partial<TrackedVan> & { id: string; slug: string; pricing: Settings };
  initialStart?: IsoDate;
  initialEnd?: IsoDate;
  /** Search mode on /kombiji: called after new dates are applied (e.g. to close the panel). */
  onSearched?: () => void;
  /** Search mode on a landing page for one type of van: search only those. */
  category?: Category;
}

function monthStart(base: IsoDate, offset: number): { y: number; m: number; first: IsoDate } {
  const [by, bm] = base.split("-").map(Number) as [number, number];
  const idx = bm - 1 + offset;
  const y = by + Math.floor(idx / 12);
  const m = ((idx % 12) + 12) % 12;
  return { y, m, first: `${y}-${String(m + 1).padStart(2, "0")}-01` };
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/** The ticket: a calendar to pick dates, with a van's availability and live price. */
export function BookingWidget({ van, initialStart, initialEnd, onSearched, category }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t: d, lp } = useLocale();
  const t = d.ticket;
  const dayWord = d.days;
  const ON_REQUEST = d.onRequest;
  const MONTHS = d.months;
  const [today, setToday] = useState<IsoDate>(() => todayIn());
  const [offset, setOffset] = useState(0);
  const [start, setStart] = useState<IsoDate | null>(initialStart ?? null);
  const [end, setEnd] = useState<IsoDate | null>(initialEnd ?? null);
  const [taken, setTaken] = useState<Set<IsoDate>>(new Set());
  const [loading, setLoading] = useState(Boolean(van));
  const [loadError, setLoadError] = useState(false);
  const settings = van?.pricing;

  useEffect(() => {
    setStart(initialStart ?? null);
    setEnd(initialEnd ?? null);
  }, [initialStart, initialEnd]);

  const months = useMemo(() => [monthStart(today, offset), monthStart(today, offset + 1)], [today, offset]);

  useEffect(() => {
    if (!van) return;
    const from = months[0]!.first;
    const last = months[1]!;
    const to = `${last.first.slice(0, 8)}${String(daysInMonth(last.y, last.m)).padStart(2, "0")}`;
    let cancelled = false;
    setLoading(true);
    api<Availability & { today: IsoDate }>(`/vans/${van.slug}/availability?from=${from}&to=${to}`)
      .then((a) => {
        if (cancelled) return;
        setTaken((prev) => new Set([...prev, ...a.unavailable]));
        setToday(a.today);
        setLoadError(false);
      })
      .catch(() => !cancelled && setLoadError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [months, van]);

  function pick(d: IsoDate) {
    if (!start || end || d <= start) {
      setStart(d);
      setEnd(null);
      return;
    }
    if (eachDate(start, d).some((x) => taken.has(x))) {
      setStart(d);
      setEnd(null);
      return;
    }
    setEnd(d);
  }

  const q = start && end && settings ? quote({ start, end }, settings) : null;
  const ready = van ? q !== null && q.errors.length === 0 : Boolean(start && end);
  const days = start && end ? Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) : 0;

  /** Opens the search with these dates; on /kombiji itself, keeps the filters already set. */
  function search() {
    if (!start || !end) return;
    const searchPath = lp("/kombiji");
    const onSearch = pathname === searchPath;
    const params = new URLSearchParams(onSearch ? window.location.search : "");
    params.set("start", start);
    params.set("end", end);
    params.delete("page");
    if (category && !onSearch) params.set("type", category);
    if (onSearch) {
      router.replace(`${searchPath}?${params}`, { scroll: false });
      onSearched?.();
    } else {
      router.push(`${searchPath}?${params}`);
    }
  }

  let hint = t.pickStart;
  if (loadError) hint = t.loadError;
  else if (start && !end) hint = t.pickEnd;
  else if (q?.errors.length) hint = translateQuoteError(q.errors[0]!, locale);
  else if (q) hint = t.change(q.days, dayWord(q.days));
  else if (start && end) hint = t.change(days, dayWord(days));

  return (
    <section id="rezervacija" className="ticket" aria-labelledby="ticket-title">
      <div className="t-head">
        <span id="ticket-title">{van ? t.titleVan : t.titleSearch}</span>
        <span>{t.noDriver}</span>
      </div>
      <div className="t-dates">
        <div>
          <div className="t-label">{t.pickup}</div>
          <div className="t-date">{start ? shortDate(start, locale) : "— —"}</div>
        </div>
        <div>
          <div className="t-label">{t.return}</div>
          <div className="t-date">{end ? shortDate(end, locale) : "— —"}</div>
        </div>
      </div>

      <div className={`t-body${loading ? " loading" : ""}`}>
        <div className="t-bar">
          <span className={`t-hint${loadError || q?.errors.length ? " err" : ""}`} aria-live="polite">
            {hint}
          </span>
          <div className="pager">
            <button type="button" aria-label={t.prevMonth} disabled={offset === 0} onClick={() => setOffset((o) => o - 1)}>
              ←
            </button>
            <button type="button" aria-label={t.nextMonth} disabled={offset >= 11} onClick={() => setOffset((o) => o + 1)}>
              →
            </button>
          </div>
        </div>

        <div className="months">
          {months.map(({ y, m, first }) => {
            const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
            const dates = eachDate(first, addDays(first, daysInMonth(y, m) - 1));
            return (
              <div className="month" key={first}>
                <h3>
                  {MONTHS[m]} {y}
                </h3>
                <div className="wk" aria-hidden="true">
                  {d.weekHeader.map((w) => <span key={w}>{w}</span>)}
                </div>
                <div className="days">
                  {Array.from({ length: lead }, (_, i) => (
                    <span key={`b${i}`} />
                  ))}
                  {dates.map((d) => {
                    const past = d < today;
                    const isTaken = taken.has(d);
                    const state = past
                      ? "past"
                      : isTaken
                        ? "taken"
                        : d === start || d === end
                          ? "edge"
                          : start && end && d > start && d < end
                            ? "range"
                            : "free";
                    const label = t.state[state];
                    return (
                      <button
                        key={d}
                        type="button"
                        className="day"
                        data-state={state}
                        disabled={past || isTaken}
                        aria-pressed={state === "edge"}
                        aria-label={locale === "en" ? `${MONTHS[m]} ${Number(d.slice(8))}, ${y}, ${label}` : `${Number(d.slice(8))}. ${MONTHS[m]} ${y}, ${label}`}
                        onClick={() => pick(d)}
                      >
                        {Number(d.slice(8))}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="legend">
          <span><i className="free" />{t.free}</span>
          {van && <span><i className="taken" />{t.taken}</span>}
          <span><i className="mine" />{t.yours}</span>
        </div>
      </div>

      {van && settings ? (
        <>
          <div className="receipt" aria-live="polite">
            {settings.priceOnRequest ? (
              <div className="line">
                <span>{t.rental}{q && !q.errors.length ? `, ${q.days} ${dayWord(q.days)}` : ""}</span>
                <span className="fill" />
                <span>{ON_REQUEST}</span>
              </div>
            ) : q && q.rentalLines.length ? (
              q.rentalLines.map((l) => (
                <div className="line" key={l.rate}>
                  <span>{translateRentalLine(l.label, locale)}</span>
                  <span className="fill" />
                  <span>{km(l.amount)}</span>
                </div>
              ))
            ) : (
              <div className="line">
                <span>{t.rentalFrom(settings.dailyRate)}</span>
                <span className="fill" />
                <span>—</span>
              </div>
            )}
            {q && q.discount > 0 && (
              <div className="line minus">
                <span>{t.discount(q.discountPct)}</span>
                <span className="fill" />
                <span>−{km(q.discount)}</span>
              </div>
            )}
            <div className="line dim">
              <span>{t.deposit}</span>
              <span className="fill" />
              <span>{km(settings.deposit)}</span>
            </div>
          </div>

          {/* On phones this bar stays pinned to the bottom of the screen. */}
          <div className="t-foot price-bar">
            {settings.priceOnRequest ? (
              <div className="t-total">
                <span className="t-label">{ready && q ? `${t.price}, ${q.days} ${dayWord(q.days)}` : t.price}</span>
                <span>
                  <strong>{ON_REQUEST}</strong>
                </span>
              </div>
            ) : ready && q ? (
              <div className="t-total">
                <span className="t-label">{t.total}, {q.days} {dayWord(q.days)}</span>
                <span>
                  <strong>{km(q.total)}</strong>
                  <small>≈ {kmToEur(q.total)} €</small>
                </span>
              </div>
            ) : (
              <div className="t-total">
                <span className="t-label">{t.price}</span>
                <span>
                  <strong>{t.from} {km(settings.dailyRate)}</strong>
                  <small>{t.perDay}</small>
                </span>
              </div>
            )}
            <Link
              className="btn-accent"
              href={ready ? lp(`/rezervacija?van=${van.slug}&start=${start}&end=${end}`) : "#rezervacija"}
              onClick={() =>
                ready && q && van.name &&
                trackEcommerce("begin_checkout", [van as TrackedVan], { value: q.total, prices: [q.total], start_date: start, end_date: end, days: q.days })
              }
            >
              {ready ? t.send : t.pickDates} <span aria-hidden="true">{ready ? "→" : "↑"}</span>
            </Link>
          </div>
        </>
      ) : (
        <div className="t-foot">
          <div className="t-total">
            <span className="t-label">{t.period}</span>
            <span><strong>{ready ? `${days} ${dayWord(days)}` : "—"}</strong></span>
          </div>
          <button type="button" className="btn-accent" disabled={!ready} onClick={search}>
            {t.freeVans} <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </section>
  );
}
