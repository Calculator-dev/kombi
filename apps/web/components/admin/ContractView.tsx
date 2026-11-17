"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import type { ContractData } from "@kombi/shared";
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
export function RenterContract({ data }: { data: ContractData }) {
  return (
    <ReadOnly.Provider value>
      <ContractSheet data={data} renter />
    </ReadOnly.Provider>
  );
}

export function ContractSheet({ data, renter }: { data: ContractData; renter?: boolean }) {
  const missing = [
    ...lessorRows(data).filter(([, v]) => !v).map(([l]) => `${l.toLowerCase()} (najmodavac)`),
    ...renterRows(data).filter(([, v]) => !v).map(([l]) => l),
    !data.terms.plates && "registarske oznake",
    !data.terms.vin && "broj šasije",
    !data.terms.color && "boja",
    data.total === null && "cijena najma",
  ].filter(Boolean);

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

      <article className="contract">
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
    </main>
  );
}
