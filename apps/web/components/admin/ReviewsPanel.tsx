"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { shortDate } from "@/lib/format";

interface AdminReview {
  id: string;
  rating: number;
  comment: string;
  name: string;
  hidden: boolean;
  createdAt: string;
  vanName: string;
  vanSlug: string;
}

/** Platform admins: every review, with a switch to hide one (abuse, personal data). */
export function ReviewsPanel() {
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi<AdminReview[]>("/reviews").then(setReviews, (e) => setError(e instanceof Error ? e.message : "Nije učitano."));
  }, []);

  async function toggle(r: AdminReview) {
    try {
      const updated = await adminApi<AdminReview>(`/reviews/${r.id}`, { method: "PATCH", json: { hidden: !r.hidden } });
      setReviews((list) => list?.map((x) => (x.id === r.id ? { ...x, hidden: updated.hidden } : x)) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nije sačuvano.");
    }
  }

  return (
    <>
      <h1 className="display h-lg">Ocjene</h1>
      <p className="lead">
        Ocjene ostavljaju kupci nakon potvrđenog i završenog najma. Vlasnik ih ne može mijenjati; ovdje možete sakriti
        ocjenu koja vrijeđa ili sadrži lične podatke.
      </p>
      {error && <p className="alert" role="alert">{error}</p>}
      {reviews?.length === 0 && <p className="empty">Još nema ocjena.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {reviews?.map((r) => (
          <article key={r.id} className="req" style={{ opacity: r.hidden ? 0.55 : 1 }}>
            <div className="who">
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span className="stars">{"★".repeat(r.rating)}<span>{"★".repeat(5 - r.rating)}</span></span>
                <strong>{r.name}</strong>
                <a className="mono" style={{ fontSize: 12 }} href={`/kombi/${r.vanSlug}`} target="_blank" rel="noopener">{r.vanName}</a>
                <span className="caption">{shortDate(r.createdAt.slice(0, 10))}</span>
                {r.hidden && <span className="badge" data-s="declined">Sakrivena</span>}
              </div>
              {r.comment && <div className="meta">„{r.comment}"</div>}
            </div>
            <div className="btns">
              <button type="button" className="small-btn" onClick={() => void toggle(r)}>{r.hidden ? "Prikaži" : "Sakrij"}</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
