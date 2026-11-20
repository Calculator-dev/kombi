"use client";

import Link from "next/link";
import { useState } from "react";
import { reviewSchema } from "@kombi/shared";
import { ApiError, api } from "@/lib/api";

/** What the API says about a review link (see apps/api services/reviews.ts). */
export interface ReviewContext {
  vanName: string;
  vanSlug: string;
  start: string;
  end: string;
  name: string;
  state: "open" | "done" | "early" | "closed";
  review?: { rating: number; comment: string };
}

const date = (iso: string) => iso.split("-").reverse().join(".") + ".";
const LABELS = ["", "Loše", "Slabo", "Dobro", "Vrlo dobro", "Odlično"];

/** The customer rates a finished rental: 1–5 stars and an optional comment. */
export function ReviewForm({ token, initial }: { token: string; initial: ReviewContext }) {
  const [ctx, setCtx] = useState(initial);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = reviewSchema.safeParse({ rating, comment });
    if (!r.success) {
      setError(r.error.issues[0]?.message ?? "Provjerite ocjenu.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      setCtx(await api<ReviewContext>(`/reviews/${token}`, { method: "POST", json: r.data }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nije poslano. Pokušajte ponovo.");
    } finally {
      setBusy(false);
    }
  }

  const head = (
    <>
      <p className="eyebrow">{ctx.vanName} · {date(ctx.start)} – {date(ctx.end)}</p>
      <h1 className="display h-lg">
        {ctx.state === "done" ? "Hvala na ocjeni" : `Kako je bilo, ${ctx.name}?`}
        <span className="dot">{ctx.state === "done" ? "." : ""}</span>
      </h1>
    </>
  );

  if (ctx.state !== "open") {
    return (
      <div className="review-card">
        {head}
        <p className="lead">
          {ctx.state === "done" && "Vaša ocjena je objavljena na stranici vozila i pomaže drugima da izaberu."}
          {ctx.state === "early" && "Najam možete ocijeniti nakon dana povratka vozila. Link ostaje isti, sačuvajte ovaj email."}
          {ctx.state === "closed" && "Ovaj upit nije završio najmom, pa ga nije moguće ocijeniti."}
        </p>
        <Link className="btn-ghost" href={`/kombi/${ctx.vanSlug}`} style={{ alignSelf: "flex-start" }}>Stranica vozila</Link>
      </div>
    );
  }

  const shown = hover || rating;
  return (
    <form className="review-card" onSubmit={submit}>
      {head}
      <p className="lead">Ocjena se objavljuje na stranici vozila s vašim imenom ({ctx.name}). Prezime i kontakt se ne prikazuju.</p>
      <fieldset className="star-input" onMouseLeave={() => setHover(0)}>
        <legend>Ocjena</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} data-on={n <= shown || undefined} onMouseEnter={() => setHover(n)}>
            <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
            <span aria-hidden="true">★</span>
            <span className="sr-only">{n} – {LABELS[n]}</span>
          </label>
        ))}
        <span className="star-label" aria-hidden="true">{LABELS[shown]}</span>
      </fieldset>
      <label className="field">
        Komentar (neobavezno)
        <textarea rows={4} maxLength={1000} value={comment} placeholder="Stanje vozila, preuzimanje, odnos vlasnika…" onChange={(e) => setComment(e.target.value)} />
      </label>
      {error && <p className="alert" role="alert">{error}</p>}
      <button className="btn-dark" type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>
        {busy ? "Šaljem…" : "Pošalji ocjenu"}
      </button>
    </form>
  );
}
