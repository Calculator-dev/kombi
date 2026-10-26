"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  dayWord,
  eachDate,
  kmToEur,
  quote,
  todayIn,
  type Availability,
  type IsoDate,
  type Settings,
} from "@kombi/shared";
import { api } from "@/lib/api";
import { MONTHS, km, shortDate } from "@/lib/format";

interface Props {
  /** With a van: its free days and exact price. Without: pick dates to search all vans. */
  van?: { id: string; slug: string; pricing: Settings };
  initialStart?: IsoDate;
  initialEnd?: IsoDate;
  /** Search mode on /kombiji: called after new dates are applied (e.g. to close the panel). */
  onSearched?: () => void;
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
export function BookingWidget({ van, initialStart, initialEnd, onSearched }: Props) {
  const router = useRouter();
  const pathname = usePathname();
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
    const onSearch = pathname === "/kombiji";
    const params = new URLSearchParams(onSearch ? window.location.search : "");
    params.set("start", start);
    params.set("end", end);
    params.delete("page");
    if (onSearch) {
      router.replace(`/kombiji?${params}`, { scroll: false });
      onSearched?.();
    } else {
      router.push(`/kombiji?${params}`);
    }
  }

  let hint = "Odaberite dan preuzimanja";
  if (loadError) hint = "Kalendar se nije učitao. Osvježite stranicu ili nas kontaktirajte.";
  else if (start && !end) hint = "Sada odaberite dan povratka";
  else if (q?.errors.length) hint = q.errors[0]!;
  else if (q) hint = `${q.days} ${dayWord(q.days)} — kliknite za promjenu`;
  else if (start && end) hint = `${days} ${dayWord(days)} — kliknite za promjenu`;

  return (
    <section id="rezervacija" className="ticket" aria-labelledby="ticket-title">
      <div className="t-head">
        <span id="ticket-title">{van ? "Rezervacija" : "Kada vam treba kombi?"}</span>
        <span>Bez vozača</span>
      </div>
      <div className="t-dates">
        <div>
          <div className="t-label">Preuzimanje</div>
          <div className="t-date">{start ? shortDate(start) : "— —"}</div>
        </div>
        <div>
          <div className="t-label">Povratak</div>
          <div className="t-date">{end ? shortDate(end) : "— —"}</div>
        </div>
      </div>

      <div className={`t-body${loading ? " loading" : ""}`}>
        <div className="t-bar">
          <span className={`t-hint${loadError || q?.errors.length ? " err" : ""}`} aria-live="polite">
            {hint}
          </span>
          <div className="pager">
            <button type="button" aria-label="Prethodni mjesec" disabled={offset === 0} onClick={() => setOffset((o) => o - 1)}>
              ←
            </button>
            <button type="button" aria-label="Sljedeći mjesec" disabled={offset >= 11} onClick={() => setOffset((o) => o + 1)}>
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
                  <span>Po</span><span>Ut</span><span>Sr</span><span>Če</span><span>Pe</span><span>Su</span><span>Ne</span>
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
                    const label = { past: "prošlo", taken: "zauzeto", edge: "odabrano", range: "u periodu najma", free: "slobodno" }[state];
                    return (
                      <button
                        key={d}
                        type="button"
                        className="day"
                        data-state={state}
                        disabled={past || isTaken}
                        aria-pressed={state === "edge"}
                        aria-label={`${Number(d.slice(8))}. ${MONTHS[m]} ${y}, ${label}`}
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
          <span><i className="free" />Slobodno</span>
          {van && <span><i className="taken" />Zauzeto</span>}
          <span><i className="mine" />Vaši datumi</span>
        </div>
      </div>

      {van && settings ? (
        <>
          <div className="receipt" aria-live="polite">
            {q && q.rentalLines.length ? (
              q.rentalLines.map((l) => (
                <div className="line" key={l.rate}>
                  <span>{l.label}</span>
                  <span className="fill" />
                  <span>{km(l.amount)}</span>
                </div>
              ))
            ) : (
              <div className="line">
                <span>Najam od {settings.dailyRate} KM/dan</span>
                <span className="fill" />
                <span>—</span>
              </div>
            )}
            {q && q.discount > 0 && (
              <div className="line minus">
                <span>Popust 7+ dana −{q.discountPct}%</span>
                <span className="fill" />
                <span>−{km(q.discount)}</span>
              </div>
            )}
            <div className="line dim">
              <span>Depozit (vraća se)</span>
              <span className="fill" />
              <span>{km(settings.deposit)}</span>
            </div>
          </div>

          <div className="t-foot">
            <div className="t-total">
              <span className="t-label">Ukupno</span>
              <span>
                <strong>{km(ready && q ? q.total : 0)}</strong>
                <small>≈ {kmToEur(ready && q ? q.total : 0)} €</small>
              </span>
            </div>
            <Link
              className="btn-accent"
              href={ready ? `/rezervacija?van=${van.slug}&start=${start}&end=${end}` : "#rezervacija"}
              aria-disabled={!ready}
              tabIndex={ready ? undefined : -1}
            >
              Pošalji upit <span aria-hidden="true">→</span>
            </Link>
          </div>
        </>
      ) : (
        <div className="t-foot">
          <div className="t-total">
            <span className="t-label">Period</span>
            <span><strong>{ready ? `${days} ${dayWord(days)}` : "—"}</strong></span>
          </div>
          <button type="button" className="btn-accent" disabled={!ready} onClick={search}>
            Slobodni kombiji <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </section>
  );
}
