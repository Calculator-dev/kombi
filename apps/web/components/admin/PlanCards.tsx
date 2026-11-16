import { PLANS, PLAN_INFO, planVans } from "@kombi/shared";
import { SITE } from "@/lib/site";
import type { Me } from "./types";

/** The packages side by side, with the owner's own marked. Packages are changed by the platform, on request. */
export function PlanCards({ me }: { me: Me }) {
  return (
    <section aria-labelledby="paketi-h">
      <h2 id="paketi-h" className="display h-md" style={{ marginBottom: 8 }}>Paket</h2>
      <ul className="plans">
        {PLANS.map((p) => (
          <li key={p} aria-current={me.plan === p || undefined}>
            <strong>{PLAN_INFO[p].label}</strong>
            <span>Na stranici: {planVans(p)}</span>
            <span>{PLAN_INFO[p].analytics ? "Analitika: pregledi, upiti i prihod" : "Bez analitike"}</span>
            {me.plan === p && <span className="badge" data-s="confirmed">Vaš paket</span>}
          </li>
        ))}
      </ul>
      <p className="caption" style={{ marginTop: 12 }}>
        Za veći paket javite nam se na <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
    </section>
  );
}
