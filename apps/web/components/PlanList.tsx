import { PLANS, PLAN_INFO, type Plan } from "@kombi/shared";

/** The packages on offer. Without one, an owner can publish a single van; that is not shown as a package. */
const PAID = PLANS.filter((p) => p !== "free");
import { SITE } from "@/lib/site";

/** Who each package is for, and how many vans it shows, in words. */
const COPY: Record<Plan, { forWho: string; vans: string; vansNote: string }> = {
  free: { forWho: "", vans: "1", vansNote: "kombi na stranici" },
  bronze: { forWho: "Za nekoliko kombija", vans: "3", vansNote: "kombija na stranici" },
  silver: { forWho: "Za rent-a-car firme", vans: "10", vansNote: "kombija na stranici" },
  gold: { forWho: "Za velike flote", vans: "∞", vansNote: "neograničeno kombija" },
};

/** The package we point people to. */
const RECOMMENDED: Plan = "silver";

/** What every package includes: said once, above the cards, instead of on every card. */
export const PLAN_BASICS = [
  "Stranica kombija s fotografijama i 360° pogledom",
  "Kalendar i upiti za rezervaciju",
  "Ugovor o najmu popunjen iz upita",
  "Cijene po sezoni ili po dogovoru",
];

const Check = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const askHref = (p: Plan) =>
  `mailto:${SITE.email}?subject=${encodeURIComponent(`Paket ${PLAN_INFO[p].label}`)}`;

/**
 * The owner packages as pricing cards. On the homepage every card has its own
 * button; in the admin (`current` set) the owner's own package is marked instead.
 */
export function PlanList({ current }: { current?: Plan }) {
  return (
    <ul className="plans">
      {PAID.map((p) => {
        const info = PLAN_INFO[p];
        const c = COPY[p];
        const mine = current === p;
        const featured = !current && p === RECOMMENDED;
        return (
          <li key={p} className="plan" data-plan={p} data-featured={featured || undefined} aria-current={mine || undefined}>
            {featured && <span className="plan-flag">Preporučeno</span>}
            {mine && <span className="plan-flag">Vaš paket</span>}
            <div className="plan-head">
              <span className="plan-medal" aria-hidden="true" />
              <h3>{info.label}</h3>
            </div>
            <p className="plan-for">{c.forWho}</p>
            <p className="plan-price">
              Cijena na upit
            </p>
            <p className="plan-vans">
              <strong>{c.vans}</strong>
              <span>{c.vansNote}</span>
            </p>
            <ul className="plan-features">
              <li><Check /> Sve osnovne mogućnosti</li>
              <li data-off={!info.analytics || undefined}>
                {info.analytics ? <Check /> : <span className="plan-dash" aria-hidden="true">–</span>}
                {info.analytics ? "Analitika: pregledi, upiti i prihod" : "Bez analitike"}
              </li>
            </ul>
            {!current && (
              <a className={`${featured ? "btn-dark" : "btn-ghost"} plan-cta`} href={askHref(p)}>Zatražite {info.label}</a>
            )}
            {current && !mine && (
              <a className="small-btn plan-cta" href={askHref(p)}>Zatražite {info.label}</a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
