/**
 * Shown over the page on a full load until everything has loaded: the logo,
 * with its van (the outline above the lettering) driving in from the left,
 * stopping over "KOMBI.BA" and driving off to the right, again and again.
 *
 * The logo is one picture, so the van and the lettering are two copies of it,
 * each clipped to its part (see .splash-van / .splash-text in globals.css).
 * It disappears once the browser fires "load" (SPLASH_SCRIPT), and on its own
 * after a few seconds in case that never happens. Without JavaScript it never shows.
 */
export function Splash() {
  return (
    <div id="splash" className="splash" aria-hidden="true">
      <div className="splash-logo">
        {(["text", "van"] as const).map((part) => (
          <span key={part} className={`splash-${part}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo-light" src="/logo.png" alt="" width={640} height={191} fetchPriority="high" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo-dark" src="/logo-dark.png" alt="" width={640} height={191} />
          </span>
        ))}
        <span className="splash-road" />
      </div>
    </div>
  );
}

/**
 * Hides the splash once the page has loaded, but not before the van has had
 * time to drive in (a very fast load would only flash it). After the fade it is
 * taken out of the page altogether.
 */
export const SPLASH_SCRIPT = `(function(){var t0=Date.now(),d=document.documentElement;function done(){setTimeout(function(){d.classList.add("loaded");setTimeout(function(){d.classList.add("splash-gone")},400)},Math.max(0,700-(Date.now()-t0)))}if(document.readyState==="complete")done();else addEventListener("load",done)})()`;
