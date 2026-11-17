import { PLANS, PLAN_INFO, planVans, type Plan } from "@kombi/shared";

/** The owner packages side by side: what each allows. Optionally marks one as current. */
export function PlanList({ current }: { current?: Plan }) {
  return (
    <ul className="plans">
      {PLANS.map((p) => (
        <li key={p} aria-current={current === p || undefined}>
          <strong>{PLAN_INFO[p].label}</strong>
          <span className="plan-price">{p === "free" ? "Besplatno" : "Cijena na upit"}</span>
          <span>Na stranici: {planVans(p)}</span>
          <span>{PLAN_INFO[p].analytics ? "Analitika: pregledi, upiti i prihod" : "Bez analitike"}</span>
          {current === p && <span className="badge" data-s="confirmed">Vaš paket</span>}
        </li>
      ))}
    </ul>
  );
}
