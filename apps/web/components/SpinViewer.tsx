"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { PhotoUrls } from "@kombi/shared";
import { track } from "@/lib/analytics";

/**
 * The 360° view: photos taken from each clock position around the van. Dragging
 * (or the arrow buttons and keys) steps from one to the next; all photos load up
 * front so turning is instant. Phones get the smaller copies.
 */
export function SpinViewer({ photos, name }: { photos: PhotoUrls[]; name: string }) {
  const n = photos.length;
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; from: number } | null>(null);
  const [index, setIndex] = useState(0);
  const [small, setSmall] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(0);
  const [touched, setTouched] = useState(false);

  // Decided after mounting, so the server and browser render the same thing first.
  useEffect(() => setSmall(window.matchMedia("(max-width: 700px)").matches), []);

  const turn = (i: number) => setIndex(((i % n) + n) % n);

  function firstTouch() {
    if (touched) return;
    setTouched(true);
    track("view_360", { item_name: name });
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    drag.current = { x: e.clientX, from: index };
    e.currentTarget.setPointerCapture(e.pointerId);
    firstTouch();
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current || !stage.current) return;
    // About one full turn per width of the photo, but never too fiddly on a phone.
    const step = Math.min(80, Math.max(20, stage.current.clientWidth / n));
    turn(drag.current.from + Math.round((drag.current.x - e.clientX) / step));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    firstTouch();
    turn(index + (e.key === "ArrowRight" ? 1 : -1));
  }

  const first = photos[0]!;
  return (
    <figure className="spin">
      <div
        ref={stage}
        className="spin-stage"
        style={{ aspectRatio: `${first.width} / ${first.height}` }}
        tabIndex={0}
        role="group"
        aria-roledescription="360° pogled"
        aria-label={`${name}, 360° pogled. Strelicama lijevo i desno okrećete kombi.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={onKeyDown}
      >
        {small !== null &&
          photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={small ? p.thumbUrl : p.url}
              alt=""
              draggable={false}
              data-on={i === index || undefined}
              onLoad={() => setLoaded((l) => l + 1)}
            />
          ))}
        {!touched && (
          <span className="spin-hint" aria-hidden="true">
            ↔ Povucite da okrenete kombi
          </span>
        )}
        {small !== null && loaded < n && (
          <span className="spin-loading" role="status">
            Učitavam {loaded}/{n}
          </span>
        )}
      </div>
      <figcaption className="spin-bar">
        <button type="button" aria-label="Okreni lijevo" onClick={() => (firstTouch(), turn(index - 1))}>←</button>
        <SpinCompass index={index} n={n} />
        <button type="button" aria-label="Okreni desno" onClick={() => (firstTouch(), turn(index + 1))}>→</button>
      </figcaption>
    </figure>
  );
}

/** The van from above (front up) and a dot where the camera stands. */
function SpinCompass({ index, n }: { index: number; n: number }) {
  const angle = (index / n) * 2 * Math.PI;
  const x = 28 + 22 * Math.sin(angle);
  const y = 28 - 22 * Math.cos(angle);
  return (
    <svg className="spin-compass" viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
      <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="2 3" />
      <rect x="21" y="15" width="14" height="26" rx="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
      <rect x="23" y="17" width="10" height="5" rx="1.5" fill="currentColor" fillOpacity="0.5" />
      <line x1={x} y1={y} x2="28" y2="28" stroke="var(--accent)" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx={x} cy={y} r="4.5" fill="var(--accent)" />
    </svg>
  );
}
