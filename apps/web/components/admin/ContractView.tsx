"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import { HANDOVER_LABELS, HANDOVER_SIDES, type ContractData, type HandoverVideo } from "@kombi/shared";
import { VideoUpload } from "./VideoUpload";
import { ApiError, adminApi } from "@/lib/api";
import { PREAMBLE, contractArticles, dotDate, lessorRows, placeOf, renterRows, type Block } from "@/lib/contract";

/** True on the customer's copy: values are shown, not editable. */
const ReadOnly = createContext(false);

/** A value in the contract: click to fill in or correct before printing. Empty ones print as a blank line. */
function Fill({ value, wide }: { value: string; wide?: boolean }) {
  const readOnly = useContext(ReadOnly);
  if (readOnly) return <span className="fill-in" data-wide={wide || undefined}>{value}</span>;
  return (
    <span className="fill-in" data-wide={wide || undefined} contentEditable suppressContentEditableWarning spellCheck={false}>
      {value}
    </span>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <table className="contract-rows">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td><Fill value={value} wide /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BlockView({ block }: { block: Block }) {
  if (typeof block === "string") return <p>{block}</p>;
  if ("rows" in block) return <Rows rows={block.rows} />;
  if ("ol" in block) return <ol>{block.ol.map((i) => <li key={i}>{i}</li>)}</ol>;
  return <ul>{block.ul.map((i) => <li key={i}>{i}</li>)}</ul>;
}

/** The rental contract for one booking, filled in and ready to print or save as PDF. */
export function ContractView({ bookingId }: { bookingId: string }) {
  const [data, setData] = useState<ContractData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi<ContractData>(`/bookings/${encodeURIComponent(bookingId)}/contract`)
      .then(setData)
      .catch((e) =>
        setError(
          e instanceof ApiError && e.status === 401
            ? "Prijavite se u admin panel, pa ponovo otvorite ugovor."
            : e instanceof ApiError && e.status !== 404
              ? e.message
              : "Ugovor za ovu rezervaciju nije pronađen.",
        ),
      );
  }, [bookingId]);

  if (error) {
    return (
      <main className="wrap login">
        <p className="alert" role="alert">{error}</p>
        <Link className="btn-ghost" href="/admin" style={{ alignSelf: "flex-start" }}>Nazad u admin</Link>
      </main>
    );
  }
  if (!data) return <main className="wrap login"><p className="empty">Učitavam…</p></main>;
  return <ContractSheet data={data} />;
}

/** The customer's read-only copy, opened from the link in the confirmation email. */
export function RenterContract({ data, token }: { data: ContractData; token: string }) {
  return (
    <ReadOnly.Provider value>
      <ContractSheet data={data} renter token={token} />
    </ReadOnly.Provider>
  );
}

export function ContractSheet({ data, renter, token }: { data: ContractData; renter?: boolean; token?: string }) {
  const missing = [
    ...lessorRows(data).filter(([, v]) => !v).map(([l]) => `${l.toLowerCase()} (najmodavac)`),
    ...renterRows(data).filter(([, v]) => !v).map(([l]) => l),
    !data.terms.plates && "registarske oznake",
    !data.terms.vin && "broj šasije",
    !data.terms.color && "boja",
    data.total === null && "cijena najma",
  ].filter(Boolean);

  const filmNow = Boolean(renter && token && data.renterRecording?.open);

  return (
    <main className="contract-page">
      <div className="contract-bar">
        {renter ? (
          <>
            <Link className="btn-ghost" href="/">kombi.ba</Link>
            <p>
              Ovo je ugovor za vašu rezervaciju {data.ref}. Prazna polja popunjavamo zajedno pri preuzimanju kombija,
              kada ugovor i potpisujemo. Ako nešto nije tačno, javite se vlasniku prije preuzimanja.
            </p>
          </>
        ) : (
          <>
            <Link className="btn-ghost" href="/admin">Nazad u admin</Link>
            <p>
              {missing.length > 0
                ? `Nedostaje: ${missing.join(", ")}. Kliknite na podvučeno polje i upišite, ili ostavite prazno pa dopišite rukom.`
                : "Sva podvučena polja možete ispraviti klikom prije štampanja."}{" "}
              Izmjene ovdje vrijede samo za ovu štampu.
            </p>
          </>
        )}
        <button type="button" className="btn-dark" onClick={() => window.print()}>Štampaj / sačuvaj PDF</button>
      </div>

      {/* While the customer can film the return, that comes first; the contract is below. */}
      {filmNow && <HandoverRecord data={data} token={token} />}

      <article className="contract">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {data.lessor.logo && <img className="contract-logo" src={data.lessor.logo} alt="" width={72} height={72} />}
        <h1>
          Ugovor o najmu
          <br />
          putničkog vozila - br. <Fill value={data.ref} />
        </h1>
        <p className="contract-sub">
          zaključen dana <Fill value={dotDate(data.date)} /> godine u <Fill value={placeOf(data)} />
        </p>

        <p>Ovaj ugovor zaključen je između:</p>
        <Rows rows={lessorRows(data)} />
        <Rows rows={renterRows(data)} />
        {PREAMBLE.map((p) => <p key={p}>{p}</p>)}

        {contractArticles(data).map((a, i) => (
          <section key={a.title}>
            <h2>Član {i + 1}. {a.title}</h2>
            {a.blocks.map((b, j) => <BlockView key={j} block={b} />)}
          </section>
        ))}

        <div className="contract-sign">
          <div>Najmoprimac</div>
          <div>Najmodavac</div>
        </div>
      </article>

      {!filmNow && <HandoverRecord data={data} token={renter ? token : undefined} />}
    </main>
  );
}

const fmt = (iso: string) => iso.split("-").reverse().join(".") + ".";

/**
 * Videos of the vehicle's sides: the owner's at pickup and return, and the
 * customer's at return. On the customer's link, while the return is open, the
 * customer films each side here (on a phone the camera opens straight away).
 */
function HandoverRecord({ data, token }: { data: ContractData; token?: string }) {
  const [videos, setVideos] = useState<HandoverVideo[]>(data.handover ?? []);
  const rec = data.renterRecording;
  const canFilm = Boolean(token && rec?.open);
  const groups = [
    { key: "owner-pickup", title: "Najmodavac, pri preuzimanju", list: videos.filter((v) => v.by === "owner" && v.stage === "pickup") },
    { key: "owner-return", title: "Najmodavac, pri povratku", list: videos.filter((v) => v.by === "owner" && v.stage === "return") },
    { key: "renter-return", title: token ? "Vi, pri povratku" : "Najmoprimac, pri povratku", list: videos.filter((v) => v.by === "renter") },
  ].map((g) => ({ ...g, list: HANDOVER_SIDES.flatMap((side) => g.list.filter((v) => v.side === side)) }));
  const renterGroup = groups[2]!;
  if (!videos.length && !canFilm && !(token && rec)) return null;

  return (
    <section className="contract-handover" aria-labelledby="handover-h">
      <h2 id="handover-h" className="display h-md">Zapisnik o stanju vozila</h2>
      <p className="caption">Video snimci svake strane vozila pri predaji i povratku. Ne štampaju se s ugovorom.</p>

      {token && rec && (
        <div className="renter-film">
          <h3>Snimite vozilo kad ga vraćate</h3>
          {canFilm ? (
            <>
              <p>
                Na mjestu povratka snimite telefonom kratak video svake strane vozila (5–10 sekundi, polako, s dovoljno
                svjetla). To je vaš dokaz o stanju u kojem ste vozilo vratili; vlasnik dobija obavijest kad snimite sve
                četiri. Snimati možete do {fmt(rec.until)}
              </p>
              <div className="handover-grid">
                {HANDOVER_SIDES.map((side) => {
                  const v = renterGroup.list.find((x) => x.side === side);
                  const path = `/contracts/${token}/handover/${side}`;
                  return (
                    <div key={side} className="handover-side">
                      <span className="dim">{HANDOVER_LABELS[side]}{v ? " ✓" : ""}</span>
                      <VideoUpload<HandoverVideo[]>
                        path={path}
                        publicPath
                        label="Snimi"
                        capture
                        current={v}
                        onDone={(renterList) => setVideos((all) => [...all.filter((x) => x.by !== "renter"), ...renterList])}
                        onRemove={async () => {
                          const res = await fetch(`/api${path}`, { method: "DELETE" });
                          const body = await res.json().catch(() => null);
                          if (!res.ok) throw new Error(body?.message ?? "Nije obrisano.");
                          setVideos((all) => [...all.filter((x) => x.by !== "renter"), ...(body as HandoverVideo[])]);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="caption">{renterGroup.list.length} od {HANDOVER_SIDES.length} strana snimljeno.</p>
            </>
          ) : (
            <p className="caption">
              {new Date().toISOString().slice(0, 10) < rec.from
                ? `Snimanje se otvara na dan preuzimanja, ${fmt(rec.from)}`
                : `Rok za snimanje je istekao ${fmt(rec.until)}`}
            </p>
          )}
        </div>
      )}

      {groups.map((g) =>
        g.list.length && !(canFilm && g.key === "renter-return") ? (
          <div key={g.key} className="handover-stage">
            <h3>{g.title}</h3>
            <div className="handover-grid">
              {g.list.map((v) => (
                <figure key={v.id}>
                  <video src={v.url} controls playsInline preload="metadata" />
                  <figcaption>
                    {HANDOVER_LABELS[v.side]} ·{" "}
                    {new Date(v.createdAt).toLocaleString("bs-BA", { timeZone: "Europe/Sarajevo", dateStyle: "short", timeStyle: "short" })}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        ) : null,
      )}
    </section>
  );
}
