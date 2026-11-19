import { PLANS, PLAN_INFO, type Plan } from "@kombi/shared";

/** The packages on offer. Without one, an owner can publish a single van; that is not shown as a package. */
const PAID = PLANS.filter((p) => p !== "free");
import { dict, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

/** The package we point people to. */
const RECOMMENDED: Plan = "silver";

/** How many vans each package shows. */
const VANS: Record<Plan, string> = { free: "1", bronze: "3", silver: "10", gold: "∞" };

/** What every package includes: said once, above the cards, instead of on every card. */
export const PLAN_BASICS = dict("bs").plans.basics;

const Check = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const askHref = (p: Plan, locale: Locale) =>
  `mailto:${SITE.email}?subject=${encodeURIComponent(dict(locale).plans.subject(PLAN_INFO[p].label))}`;

/**
 * The owner packages as pricing cards. On the homepage every card has its own
 * button; in the admin (`current` set) the owner's own package is marked instead.
 */
export function PlanList({ current, locale = "bs" }: { current?: Plan; locale?: Locale }) {
  const t = dict(locale).plans;
  return (
    <ul className="plans">
      {PAID.map((p) => {
        const info = PLAN_INFO[p];
                const mine = current === p;
        const featured = !current && p === RECOMMENDED;
        return (
          <li key={p} className="plan" data-plan={p} data-featured={featured || undefined} aria-current={mine || undefined}>
            {featured && <span className="plan-flag">{t.recommended}</span>}
            {mine && <span className="plan-flag">{t.yours}</span>}
            <div className="plan-head">
              <span className="plan-medal" aria-hidden="true" />
              <h3>{info.label}</h3>
            </div>
            <p className="plan-for">{t.forWho[p]}</p>
            <p className="plan-price">
              {t.priceOnRequest}
            </p>
            <p className="plan-vans">
              <strong>{VANS[p]}</strong>
              <span>{t.vansNote[p]}</span>
            </p>
            <ul className="plan-features">
              <li><Check /> {t.allBasics}</li>
              <li data-off={!info.analytics || undefined}>
                {info.analytics ? <Check /> : <span className="plan-dash" aria-hidden="true">–</span>}
                {info.analytics ? t.analytics : t.noAnalytics}
              </li>
            </ul>
            {!current && (
              <a className={`${featured ? "btn-dark" : "btn-ghost"} plan-cta`} href={askHref(p, locale)}>{t.ask(info.label)}</a>
            )}
            {current && !mine && (
              <a className="small-btn plan-cta" href={askHref(p, locale)}>{t.ask(info.label)}</a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
