"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PhotoUrls } from "@kombi/shared";
import { track as trackEvent } from "@/lib/analytics";
import { SpinViewer } from "./SpinViewer";

/**
 * A van's photos at the top of its page: on wide screens one large photo and up
 * to four small ones, on phones a full-width strip to swipe through. Any photo
 * opens a full-screen viewer for all of them; the 360° view opens in its own window.
 */
export function Gallery({ photos, name, spin }: { photos: PhotoUrls[]; name: string; spin?: PhotoUrls[] | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const spinDialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLUListElement>(null);
  const swipe = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [swipeIndex, setSwipeIndex] = useState(0);
  // The 360° photos only load once someone opens it.
  const [spinOpen, setSpinOpen] = useState(false);
  const shown = photos.slice(0, 5);

  const go = useCallback((i: number, smooth = true) => {
    const t = track.current;
    if (!t) return;
    const next = Math.max(0, Math.min(photos.length - 1, i));
    t.scrollTo({ left: next * t.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }, [photos.length]);

  function open(i: number) {
    trackEvent("view_photos", { item_name: name, photo_index: i + 1, photo_count: photos.length });
    setIndex(i);
    dialog.current?.showModal();
    // The page behind shouldn't scroll (or show its scrollbar) while the viewer is open.
    document.documentElement.style.overflow = "hidden";
    // Jump straight to the clicked photo (no slide animation on opening).
    requestAnimationFrame(() => go(i, false));
  }

  function openSpin() {
    trackEvent("open_360", { item_name: name });
    setSpinOpen(true);
    spinDialog.current?.showModal();
    document.documentElement.style.overflow = "hidden";
  }

  function onSwipe() {
    const t = swipe.current;
    if (t) setSwipeIndex(Math.round(t.scrollLeft / t.clientWidth));
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

  if (!photos.length) return null;
  // Only one of the two layouts is visible (CSS); lazy images in the hidden one never load.
  return (
    <div className="gallery" data-count={shown.length}>
      <div className="gallery-grid">
        {shown.map((p, i) => (
          <button key={p.id} type="button" onClick={() => open(i)} aria-label={`Otvori fotografiju ${i + 1} od ${photos.length}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={i === 0 ? p.url : p.thumbUrl}
              alt={i === 0 ? name : `${name}, fotografija ${i + 1}`}
              width={i === 0 ? p.width : 640}
              height={i === 0 ? p.height : 480}
              loading={i === 0 ? "eager" : "lazy"}
            />
          </button>
        ))}
      </div>
      <div className="gallery-swipe" ref={swipe} onScroll={onSwipe}>
        {photos.map((p, i) => (
          <button key={p.id} type="button" onClick={() => open(i)} aria-label={`Otvori fotografiju ${i + 1} od ${photos.length}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={i === 0 ? name : `${name}, fotografija ${i + 1}`} width={p.width} height={p.height} loading={i === 0 ? "eager" : "lazy"} />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <span className="gallery-count" aria-hidden="true">
          {swipeIndex + 1} / {photos.length}
        </span>
      )}
      <div className="gallery-actions">
        {spin && spin.length > 0 && (
          <button type="button" className="gallery-btn" onClick={openSpin}>
            <span aria-hidden="true">↻</span> 360° pogled
          </button>
        )}
        {photos.length > 1 && (
          <button type="button" className="gallery-btn gallery-all" onClick={() => open(0)}>
            Sve fotografije ({photos.length})
          </button>
        )}
      </div>

      {spin && spin.length > 0 && (
        <dialog
          ref={spinDialog}
          className="spin-dialog"
          aria-label={`360° pogled: ${name}`}
          onClose={() => {
            setSpinOpen(false);
            document.documentElement.style.overflow = "";
          }}
          onClick={(e) => e.target === e.currentTarget && spinDialog.current?.close()}
        >
          <div className="spin-dialog-head">
            <strong>360° pogled</strong>
            <button type="button" className="lightbox-close" onClick={() => spinDialog.current?.close()} aria-label="Zatvori">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 2 14 14M14 2 2 14" stroke="currentColor" strokeWidth="2" /></svg>
            </button>
          </div>
          {spinOpen && <SpinViewer photos={spin} name={name} />}
        </dialog>
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
