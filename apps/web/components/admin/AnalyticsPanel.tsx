"use client";

import { useEffect, useState } from "react";
import { PLAN_INFO, type AnalyticsReport } from "@kombi/shared";
import { adminApi } from "@/lib/api";
import { km, shortDate } from "@/lib/format";
import { PlanCards } from "./PlanCards";
import { VanSelect } from "./VanSelect";
import type { Me, OwnerVan } from "./types";

const PERIODS = [7, 30, 90] as const;
const pct = (part: number, whole: number) => (whole ? `${((part / whole) * 100).toFixed(1).replace(".", ",")}%` : "—");

/** Views, opened booking forms, requests and confirmed bookings of the owner's vans. Part of the paid packages. */
export function AnalyticsPanel({ me, vans }: { me: Me; vans: OwnerVan[] }) {
  const allowed = me.role === "admin" || PLAN_INFO[me.plan].analytics;
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const [vanId, setVanId] = useState("");
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    adminApi<AnalyticsReport>(`/analytics?days=${days}${vanId ? `&vanId=${vanId}` : ""}`).then(
      (r) => !cancelled && (setReport(r), setError(null)),
      (e) => !cancelled && setError(e instanceof Error ? e.message : "Analitika se nije učitala."),
    );
    return () => {
      cancelled = true;
    };
  }, [allowed, days, vanId]);

  if (!allowed) {
    return (
      <>
        <h1 className="display h-lg">Analitika</h1>
        <p className="note-box">
          Analitika je dio paketa Bronze, Silver i Gold: koliko ljudi otvara stranicu vašeg kombija, koliko ih krene u rezervaciju i koliko pošalje upit.
        </p>
        <PlanCards me={me} />
      </>
    );
  }

  const t = report?.totals;
  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <h1 className="display h-lg">Analitika</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          {vans.length > 1 && <VanSelect vans={vans} value={vanId} onChange={setVanId} allLabel="Svi kombiji" />}
          <div className="seg" role="group" aria-label="Period" style={{ minWidth: 240 }}>
            {PERIODS.map((p) => (
              <button key={p} type="button" aria-pressed={days === p} onClick={() => setDays(p)}>{p} dana</button>
            ))}
          </div>
        </div>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      {!report && !error && <p className="empty">Učitavam…</p>}
      {report && t && (
        <>
          <dl className="stats">
            <div><dt>Pregledi stranice kombija</dt><dd>{t.views.toLocaleString("bs-BA")}</dd></div>
            <div><dt>Otvorena forma za upit</dt><dd>{t.checkouts.toLocaleString("bs-BA")}</dd></div>
            <div><dt>Poslani upiti</dt><dd>{t.requests}</dd></div>
            <div><dt>Upita na 100 pregleda</dt><dd>{pct(t.requests, t.views)}</dd></div>
            <div><dt>Potvrđene rezervacije</dt><dd>{t.confirmed}</dd></div>
            <div><dt>Vrijednost potvrđenih</dt><dd>{km(t.revenue)}</dd></div>
          </dl>

          <section className="panel-dark" aria-labelledby="views-h">
            <h2 id="views-h" className="display h-md" style={{ marginBottom: 4 }}>Pregledi po danu</h2>
            <p className="caption" style={{ marginBottom: 16 }}>
              {shortDate(report.from)} – {shortDate(report.to)}
            </p>
            <DayBars days={report.days} />
          </section>

          {report.vans.length > 1 && (
            <section aria-labelledby="by-van-h">
              <h2 id="by-van-h" className="display h-md" style={{ marginBottom: 8 }}>Po kombiju</h2>
              <div className="table-scroll panel-dark">
                <table className="data-table">
                  <thead>
                    <tr><th>Kombi</th><th>Pregledi</th><th>Forma</th><th>Upiti</th><th>Potvrđeno</th><th>Vrijednost</th></tr>
                  </thead>
                  <tbody>
                    {report.vans.map((v) => (
                      <tr key={v.id}>
                        <th scope="row">{v.name}</th>
                        <td>{v.views}</td><td>{v.checkouts}</td><td>{v.requests}</td><td>{v.confirmed}</td><td>{km(v.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <p className="caption">
            Pregledi se broje od uvođenja analitike. Upiti i rezervacije se računaju po danu kada je upit poslan.
          </p>
        </>
      )}
    </>
  );
}

/** One bar per day; hovering (or focusing) a bar shows that day's numbers. */
function DayBars({ days }: { days: AnalyticsReport["days"] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((d) => d.views));
  // A round number at or above the highest day, for the top grid line.
  const step = 10 ** Math.floor(Math.log10(max));
  const top = Math.max(4, Math.ceil(max / step) * step);
  const a = active !== null ? days[active] : null;
  const labelEvery = Math.ceil(days.length / 6);
  return (
    <div className="bars">
      <div className="bars-readout" aria-live="polite">
        {a ? (
          <>
            <strong>{shortDate(a.day)}</strong> {a.views} pregleda · {a.checkouts} otvorenih formi · {a.requests} upita
          </>
        ) : (
          "Pređite preko dana za detalje."
        )}
      </div>
      <div className="bars-plot" onMouseLeave={() => setActive(null)}>
        <span className="bars-top">{top}</span>
        <span className="bars-mid">{top / 2}</span>
        {days.map((d, i) => (
          <button
            key={d.day}
            type="button"
            className="bar"
            data-active={active === i || undefined}
            aria-label={`${shortDate(d.day)}: ${d.views} pregleda, ${d.checkouts} otvorenih formi, ${d.requests} upita`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          >
            <i style={{ height: `${(d.views / top) * 100}%` }} />
          </button>
        ))}
      </div>
      <div className="bars-axis" aria-hidden="true">
        {days.map((d, i) => (
          <span key={d.day}>{i % labelEvery === 0 ? `${Number(d.day.slice(8))}.${Number(d.day.slice(5, 7))}.` : ""}</span>
        ))}
      </div>
    </div>
  );
}
