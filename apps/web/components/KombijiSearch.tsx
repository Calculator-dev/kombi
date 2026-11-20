"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  FEATURES,
  FUELS,
  GEARBOXES,
  SORTS,
  searchToQuery,
  vanSearchSchema,
  type FeatureId,
  type SearchResult,
  type VanSearch,
} from "@kombi/shared";
import { api } from "@/lib/api";
import { track, trackEcommerce } from "@/lib/analytics";
import { shortDate } from "@/lib/format";
import { useLocale } from "@/lib/useLocale";
import { BrandCounts } from "./BrandCounts";
import { VanCardView } from "./VanCardView";

const SEAT_OPTIONS = [5, 7, 8, 9, 12, 15, 20];
const LUGGAGE_OPTIONS = [2, 4, 6, 8, 10];
const YEARS = Array.from({ length: 12 }, (_, i) => new Date().getFullYear() - i);


/**
 * /kombiji: every filter lives in the address, so the back button works and a
 * search can be shared. Results come from /api/search, 24 at a time.
 */
export function KombijiSearch({ initial }: { initial: SearchResult }) {
  const router = useRouter();
  const { locale, t: d, lp } = useLocale();
  const t = d.results;
  const params = useSearchParams();
  const queryString = params.toString();
  const q = useMemo(() => vanSearchSchema.parse(Object.fromEntries(new URLSearchParams(queryString))), [queryString]);
  const [result, setResult] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const first = useRef(true);

  // New results whenever the address changes (the server already rendered the first ones).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    let cancelled = false;
    setLoading(true);
    api<SearchResult>(`/search?${searchToQuery({ ...q, page: undefined })}`)
      .then((r) => !cancelled && (setResult(r), setError(false)))
      .catch(() => !cancelled && setError(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  // One "search" event per result set (not per "load more").
  useEffect(() => {
    if (loading) return;
    track("search", {
      search_term: [q.q, q.city, q.seats && `${q.seats}+ putnika`, q.gearbox].filter(Boolean).join(", ") || "svi kombiji",
      start_date: q.start,
      end_date: q.end,
      filter_seats: q.seats,
      filter_luggage: q.luggage,
      filter_gearbox: q.gearbox,
      filter_fuel: q.fuel,
      filter_city: q.city,
      filter_price_min: q.priceMin,
      filter_price_max: q.priceMax,
      filter_year_min: q.yearMin,
      filter_features: q.features?.join(","),
      sort: q.sort ?? "total",
      results_total: result.total,
      results_free: result.free,
    });
    trackEcommerce("view_item_list", result.items, {
      item_list_name: "Pretraga",
      prices: result.items.map((v) => v.quote?.total ?? v.dailyRate),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.total, result.free, queryString, loading]);

  function update(patch: Partial<VanSearch>) {
    const next = searchToQuery({ ...q, ...patch, page: undefined });
    router.replace(next ? `${lp("/kombiji")}?${next}` : lp("/kombiji"), { scroll: false });
  }

  async function loadMore() {
    setMore(true);
    try {
      const r = await api<SearchResult>(`/search?${searchToQuery({ ...q, page: result.page + 1 })}`);
      setResult((cur) => ({ ...r, items: [...cur.items, ...r.items] }));
    } catch {
      setError(true);
    } finally {
      setMore(false);
    }
  }

  const dates = q.start && q.end ? { start: q.start, end: q.end } : null;
  const active = [q.airport, q.delivery, q.noDeposit, q.brand, q.type, q.seats, q.luggage, q.gearbox, q.fuel, q.city, q.priceMin, q.priceMax, q.yearMin, q.features?.length].filter(Boolean).length;
  const clear = () => update({ airport: undefined, delivery: undefined, noDeposit: undefined, brand: undefined, type: undefined, seats: undefined, luggage: undefined, gearbox: undefined, fuel: undefined, city: undefined, priceMin: undefined, priceMax: undefined, yearMin: undefined, features: undefined });

  const summary = loading
    ? t.searching
    : dates
      ? t.freeCount(result.free, q.taken && result.total > result.free ? result.total - result.free : 0)
      : q.type === "car"
        ? t.carCount(result.total)
        : t.count(result.total);

  return (
    <div className="wrap search-layout">
      <aside className="filters" data-open={filtersOpen || undefined} aria-label={t.filters}>
        <div className="filters-head">
          <h2>{t.filters}</h2>
          {active > 0 && <button type="button" className="link" onClick={clear}>{t.clear(active)}</button>}
          <button type="button" className="filters-close" onClick={() => setFiltersOpen(false)} aria-label={t.closeFilters}>✕</button>
        </div>

        {result.brands?.length > 0 && (
          <fieldset className="filter-group">
            <legend>{t.brand}</legend>
            <BrandCounts brands={result.brands} active={q.brand} onPick={(id) => update({ brand: q.brand === id ? undefined : id })} />
          </fieldset>
        )}

        <fieldset className="filter-group">
          <legend>{t.type}</legend>
          <div className="seg">
            {([undefined, ...CATEGORIES] as const).map((c) => (
              <button key={c ?? "all"} type="button" aria-pressed={q.type === c} onClick={() => update({ type: c })}>
                {c ? d.category[c] : t.all}
              </button>
            ))}
          </div>
        </fieldset>

        <Select any={t.any} label={t.seats} value={q.seats} onChange={(v) => update({ seats: v ? Number(v) : undefined })}
          options={SEAT_OPTIONS.map((n) => [String(n), `${n}+`])} />
        <Select any={t.any} label={t.luggage} value={q.luggage} onChange={(v) => update({ luggage: v ? Number(v) : undefined })}
          options={LUGGAGE_OPTIONS.map((n) => [String(n), `${n}+`])} />

        <fieldset className="filter-group">
          <legend>{t.gearbox}</legend>
          <div className="seg">
            {(["", ...GEARBOXES] as const).map((g) => (
              <button key={g || "all"} type="button" aria-pressed={(q.gearbox ?? "") === g} onClick={() => update({ gearbox: g || undefined })}>
                {g ? (d.gearboxes[g] ?? g) : t.all}
              </button>
            ))}
          </div>
        </fieldset>

        <Select any={t.any} label={t.fuel} value={q.fuel} onChange={(v) => update({ fuel: (v || undefined) as VanSearch["fuel"] })}
          options={FUELS.map((f) => [f, d.fuels[f] ?? f])} />
        <Select any={t.any} label={t.city} value={q.city} onChange={(v) => update({ city: v || undefined })}
          options={result.cities.map((c) => [c, c])} />

        <fieldset className="filter-group">
          <legend>{t.price}</legend>
          <div className="price-range">
            <NumberInput label={t.from} value={q.priceMin} onChange={(n) => update({ priceMin: n })} />
            <span aria-hidden="true">–</span>
            <NumberInput label={t.to} value={q.priceMax} onChange={(n) => update({ priceMax: n })} />
          </div>
        </fieldset>

        <Select any={t.any} label={t.year} value={q.yearMin} onChange={(v) => update({ yearMin: v ? Number(v) : undefined })}
          options={YEARS.map((y) => [String(y), String(y)])} />

        <fieldset className="filter-group">
          <legend>{t.equipment}</legend>
          {FEATURES.map(([id, label]) => (
            <label key={id} className="check">
              <input
                type="checkbox"
                checked={q.features?.includes(id) ?? false}
                onChange={(e) => {
                  const cur = q.features ?? [];
                  update({ features: e.target.checked ? [...cur, id] : cur.filter((f: FeatureId) => f !== id) });
                }}
              />
              {d.features[id] ?? label}
            </label>
          ))}
        </fieldset>

        <button type="button" className="btn-dark filters-apply" onClick={() => setFiltersOpen(false)}>
          {t.show(result.total)}
        </button>
      </aside>

      <section className="results" aria-labelledby="results-h" aria-busy={loading}>
        <ul className="quick-filters" aria-label={t.quickLabel}>
          {(
            [
              ["airport", q.airport, () => update({ airport: q.airport ? undefined : true })],
              ["automatic", q.gearbox === "Automatski", () => update({ gearbox: q.gearbox === "Automatski" ? undefined : "Automatski" })],
              ["nine", q.seats === 9, () => update({ seats: q.seats === 9 ? undefined : 9 })],
              ["noDeposit", q.noDeposit, () => update({ noDeposit: q.noDeposit ? undefined : true })],
              ["delivery", q.delivery, () => update({ delivery: q.delivery ? undefined : true })],
              ["cargo", q.type === "cargo", () => update({ type: q.type === "cargo" ? undefined : "cargo" })],
            ] as const
          ).map(([key, on, toggle]) => (
            <li key={key}>
              <button type="button" aria-pressed={Boolean(on)} onClick={toggle}>
                {on ? "✓ " : ""}{t.quick[key]}
              </button>
            </li>
          ))}
        </ul>
        <div className="results-bar">
          <div>
            <h1 id="results-h" className="display h-md">
              {dates
                ? `${shortDate(dates.start, locale)} – ${shortDate(dates.end, locale)}`
                : q.q
                  ? locale === "en" ? `“${q.q}”` : `„${q.q}"`
                  : q.type === "cargo" ? d.category.cargoLong : q.type === "passenger" ? d.category.passengerLong : q.type === "car" ? d.category.carLong : t.allVans}
            </h1>
            <p className="caption" aria-live="polite">{error ? t.loadFailed : summary}</p>
          </div>
          <div className="results-tools">
            <DateRange
              start={q.start}
              end={q.end}
              labels={{ from: t.pickup, to: t.dropoff, clear: t.clearDates }}
              onChange={(start, end) => update({ start, end, taken: start ? q.taken : undefined })}
            />
            <button type="button" className="small-btn filters-toggle" onClick={() => setFiltersOpen(true)}>
              {t.filters}{active ? ` (${active})` : ""}
            </button>
            <label className="field sort">
              {t.sort}
              <select value={q.sort ?? "total"} onChange={(e) => update({ sort: e.target.value === "total" ? undefined : (e.target.value as VanSearch["sort"]) })}>
                {SORTS.map(([id]) => <option key={id} value={id}>{t.sorts[id]}</option>)}
              </select>
            </label>
          </div>
        </div>

        {dates && (
          <label className="check show-taken">
            <input type="checkbox" checked={q.taken ?? false} onChange={(e) => update({ taken: e.target.checked || undefined })} />
            {t.showTaken}
          </label>
        )}

        {result.items.length === 0 && !loading ? (
          <div className="placeholder-box">
            {q.q ? t.noneFor(q.q) : t.none}{" "}
            {q.q && <button type="button" className="link" onClick={() => update({ q: undefined })}>{t.clearSearch}</button>}{" "}
            {active > 0 && <button type="button" className="link" onClick={clear}>{t.clearFilters}</button>}
          </div>
        ) : (
          <ul className={`van-grid${loading ? " loading" : ""}`}>
            {result.items.map((v, i) => <VanCardView key={v.id} van={v} dates={dates} list={locale === "en" ? "Search (EN)" : "Pretraga"} index={i} />)}
          </ul>
        )}

        {result.items.length < result.total && (
          <button type="button" className="btn-ghost load-more" onClick={loadMore} disabled={more}>
            {more ? t.loading : t.more(result.total - result.items.length)}
          </button>
        )}
      </section>
    </div>
  );
}

function Select({ label, value, onChange, options, any }: {
  label: string;
  any: string;
  value: string | number | undefined;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="field">
      {label}
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">{any}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

/** Applies the number a moment after typing stops, not on every key. */
function NumberInput({ label, value, onChange }: { label: string; value?: number; onChange: (n: number | undefined) => void }) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  useEffect(() => setText(value === undefined ? "" : String(value)), [value]);
  useEffect(() => {
    const n = text === "" ? undefined : Number(text);
    if (n === value) return;
    const t = setTimeout(() => onChange(n), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <label className="field">
      <span className="sr-only">{label}</span>
      <input inputMode="numeric" placeholder={label} value={text} onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 6))} />
    </label>
  );
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayAfter = (date: string) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return iso(d);
};

/**
 * Pickup and return as two plain date fields. The list follows as soon as both
 * are set; picking a pickup after the return clears the return and opens it.
 */
function DateRange({
  start,
  end,
  labels,
  onChange,
}: {
  start?: string;
  end?: string;
  labels: { from: string; to: string; clear: string };
  onChange: (start?: string, end?: string) => void;
}) {
  const [from, setFrom] = useState(start ?? "");
  const [to, setTo] = useState(end ?? "");
  useEffect(() => setFrom(start ?? ""), [start]);
  useEffect(() => setTo(end ?? ""), [end]);
  const toRef = useRef<HTMLInputElement>(null);
  const today = iso(new Date());

  const apply = (f: string, e: string) => {
    if (f && e && e > f) onChange(f, e);
  };

  return (
    <div className="date-range" role="group" aria-label={`${labels.from} – ${labels.to}`}>
      <label className="field">
        {labels.from}
        <input
          type="date"
          value={from}
          min={today}
          onChange={(ev) => {
            const f = ev.target.value;
            setFrom(f);
            if (to && f && to <= f) {
              setTo("");
              toRef.current?.focus();
              try {
                toRef.current?.showPicker();
              } catch {}
            } else apply(f, to);
          }}
        />
      </label>
      <label className="field">
        {labels.to}
        <input
          ref={toRef}
          type="date"
          value={to}
          min={from ? dayAfter(from) : dayAfter(today)}
          onChange={(ev) => {
            setTo(ev.target.value);
            apply(from, ev.target.value);
          }}
        />
      </label>
      {(start || end || from || to) && (
        <button
          type="button"
          className="date-clear"
          aria-label={labels.clear}
          title={labels.clear}
          onClick={() => {
            setFrom("");
            setTo("");
            if (start || end) onChange(undefined, undefined);
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
