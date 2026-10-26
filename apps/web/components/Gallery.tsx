"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PhotoUrls } from "@kombi/shared";

/**
 * A van's photos: the cover and thumbnails on the page; clicking one opens a
 * full-screen viewer to go through all of them with arrows, keys or swiping.
 */
export function Gallery({ photos, name }: { photos: PhotoUrls[]; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [cover, ...rest] = photos;

  const go = useCallback((i: number, smooth = true) => {
    const t = track.current;
    if (!t) return;
    const next = Math.max(0, Math.min(photos.length - 1, i));
    t.scrollTo({ left: next * t.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }, [photos.length]);

  function open(i: number) {
    setIndex(i);
    dialog.current?.showModal();
    // The page behind shouldn't scroll (or show its scrollbar) while the viewer is open.
    document.documentElement.style.overflow = "hidden";
    // Jump straight to the clicked photo (no slide animation on opening).
    requestAnimationFrame(() => go(i, false));
  }

  // Keep the counter and buttons in step with swiping/scrolling.
  function onScroll() {
    const t = track.current;
    if (t) setIndex(Math.round(t.scrollLeft / t.clientWidth));
  }

  // Keep the current thumbnail visible in the strip.
  useEffect(() => {
    if (dialog.current?.open) strip.current?.children[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    d.addEventListener("keydown", onKey);
    return () => d.removeEventListener("keydown", onKey);
  }, [go, index]);

  if (!cover) return null;
  return (
    <div className="gallery">
      <button type="button" className="gallery-main" onClick={() => open(0)} aria-label={`Otvori fotografije (${photos.length})`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover.url} alt={name} width={cover.width} height={cover.height} />
        {photos.length > 1 && <span className="gallery-count">1 / {photos.length}</span>}
      </button>
      {rest.length > 0 && (
        <ul className="gallery-rest">
          {rest.map((p, i) => (
            <li key={p.id}>
              <button type="button" onClick={() => open(i + 1)} aria-label={`Otvori fotografiju ${i + 2}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumbUrl} alt={`${name}, fotografija ${i + 2}`} width={640} height={480} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialog}
        className="lightbox"
        aria-label={`Fotografije: ${name}`}
        onClose={() => (document.documentElement.style.overflow = "")}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      >
        <span className="lightbox-count" aria-live="polite">{index + 1} / {photos.length}</span>
        <button type="button" className="lightbox-close" onClick={() => dialog.current?.close()} aria-label="Zatvori">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 2 14 14M14 2 2 14" stroke="currentColor" strokeWidth="2" /></svg>
        </button>
        <div className="lightbox-track" ref={track} onScroll={onScroll}>
          {photos.map((p, i) => (
            <figure key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`${name}, fotografija ${i + 1}`} width={p.width} height={p.height} loading={i === index ? "eager" : "lazy"} />
            </figure>
          ))}
        </div>
        {photos.length > 1 && (
          <>
            <button type="button" className="lightbox-nav prev" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Prethodna fotografija">←</button>
            <button type="button" className="lightbox-nav next" onClick={() => go(index + 1)} disabled={index === photos.length - 1} aria-label="Sljedeća fotografija">→</button>
            <ul className="lightbox-strip" ref={strip}>
              {photos.map((p, i) => (
                <li key={p.id}>
                  <button type="button" aria-current={i === index || undefined} aria-label={`Fotografija ${i + 1}`} onClick={() => go(i)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumbUrl} alt="" width={96} height={72} loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </dialog>
    </div>
  );
}
