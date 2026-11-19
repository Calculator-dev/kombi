"use client";

import { useState } from "react";
import { useLocale } from "@/lib/useLocale";

/**
 * Where the van is, on Google Maps. The map is only loaded after a click,
 * because Google's embed sets its own cookies.
 */
export function VanMap({ city }: { city: string }) {
  const { locale, t } = useLocale();
  const [shown, setShown] = useState(false);
  const place = `${city}, ${locale === "en" ? "Bosnia and Herzegovina" : "Bosna i Hercegovina"}`;
  const link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
  const embed = `https://www.google.com/maps?q=${encodeURIComponent(place)}&hl=${locale}&z=12&output=embed`;
  return (
    <div className="van-map">
      <p>{t.map.text(city)}</p>
      {shown ? (
        <iframe className="van-map-frame" src={embed} title={t.map.frame(city)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <button type="button" className="van-map-frame van-map-cover" onClick={() => setShown(true)}>
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          <strong>{t.map.show}</strong>
          <span>{t.map.note}</span>
        </button>
      )}
      <a className="btn-ghost" href={link} target="_blank" rel="noopener noreferrer">
        {t.map.open} <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
