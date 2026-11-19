"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { VanCard } from "@kombi/shared";
import { useLocale } from "@/lib/useLocale";
import { VanCardView } from "./VanCardView";

/** One row of vehicles that slides sideways: arrows on desktop, swipe on phones. */
export function VanCarousel({
  id,
  title,
  vans,
  allHref,
  allLabel,
  list,
}: {
  id: string;
  title: string;
  vans: VanCard[];
  allHref: string;
  allLabel: string;
  /** For analytics. */
  list: string;
}) {
  const { t } = useLocale();
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, vans.length]);

  // One "page" of cards per click, keeping the last card of the old page in view.
  const slide = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector("li")?.getBoundingClientRect().width ?? 300;
    el.scrollBy({ left: dir * Math.max(card, el.clientWidth - card), behavior: "smooth" });
  };

  const scrollable = !(edges.start && edges.end);
  return (
    <div className="carousel" aria-labelledby={`${id}-h`}>
      <div className="carousel-head">
        <h3 id={`${id}-h`}>
          {title} <span className="carousel-count">{vans.length}</span>
        </h3>
        <div className="carousel-tools">
          <Link href={allHref} className="carousel-all">
            {allLabel} <span aria-hidden="true">→</span>
          </Link>
          {scrollable && (
            <div className="pager">
              <button type="button" aria-label={`${t.grid.prev}: ${title}`} aria-controls={id} disabled={edges.start} onClick={() => slide(-1)}>←</button>
              <button type="button" aria-label={`${t.grid.next}: ${title}`} aria-controls={id} disabled={edges.end} onClick={() => slide(1)}>→</button>
            </div>
          )}
        </div>
      </div>
      <ul id={id} ref={track} className="van-grid carousel-track" onScroll={measure}>
        {vans.map((v, i) => (
          <VanCardView key={v.id} van={v} list={list} index={i} />
        ))}
      </ul>
    </div>
  );
}
