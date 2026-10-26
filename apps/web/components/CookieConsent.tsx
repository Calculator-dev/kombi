"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readConsent, saveConsent, type Consent } from "@/lib/consent";

/** Fired by the footer's "Postavke kolačića" link to open the settings again. */
export const OPEN_COOKIE_SETTINGS = "kombi:cookie-settings";

export function CookieSettingsLink() {
  return (
    <button type="button" className="link-plain" onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))}>
      Postavke kolačića
    </button>
  );
}

/**
 * The cookie banner. Until the visitor chooses, Google tags run with every
 * kind of consent denied (no analytics or advertising cookies).
 */
export function CookieConsent() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [choice, setChoice] = useState<Consent>({ analytics: false, marketing: false });

  useEffect(() => {
    const saved = readConsent();
    if (saved) setChoice(saved);
    else setOpen(true);
    const reopen = () => {
      setChoice(readConsent() ?? { analytics: false, marketing: false });
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS, reopen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, reopen);
  }, []);

  // The admin panel isn't tracked, so it doesn't ask.
  if (!open || pathname.startsWith("/admin")) return null;

  const decide = (c: Consent) => {
    saveConsent(c);
    setChoice(c);
    setOpen(false);
    setDetails(false);
  };

  return (
    <section className="cookie-banner" role="dialog" aria-modal="false" aria-labelledby="cookie-h">
      <div className="cookie-inner">
        <div className="cookie-text">
          <h2 id="cookie-h">Kolačići</h2>
          <p>
            Nužni kolačići omogućavaju rad stranice. Uz vašu dozvolu koristimo i analitičke kolačiće (da vidimo šta se
            koristi i popravimo ostalo) i marketinške (da mjerimo oglase). <Link href="/kolacici">Više o kolačićima</Link>
          </p>
        </div>

        {details && (
          <div className="cookie-options">
            <label className="check">
              <input type="checkbox" checked disabled />
              <span><strong>Nužni</strong> — rad stranice i pamćenje ovog izbora. Uvijek uključeni.</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={choice.analytics} onChange={(e) => setChoice((c) => ({ ...c, analytics: e.target.checked }))} />
              <span><strong>Analitika</strong> — Google Analytics: posjete i korištenje stranice, bez imena i kontakata.</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={choice.marketing} onChange={(e) => setChoice((c) => ({ ...c, marketing: e.target.checked }))} />
              <span><strong>Marketing</strong> — mjerenje i prilagođavanje oglasa (Google, Meta).</span>
            </label>
          </div>
        )}

        <div className="cookie-actions">
          {details ? (
            <button type="button" className="cookie-btn primary" onClick={() => decide(choice)}>Sačuvaj izbor</button>
          ) : (
            <button type="button" className="cookie-btn" onClick={() => setDetails(true)}>Postavke</button>
          )}
          <button type="button" className="cookie-btn" onClick={() => decide({ analytics: false, marketing: false })}>Samo nužni</button>
          <button type="button" className="cookie-btn primary" onClick={() => decide({ analytics: true, marketing: true })}>Prihvati sve</button>
        </div>
      </div>
    </section>
  );
}
