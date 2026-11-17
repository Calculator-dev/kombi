import { SITE } from "@/lib/site";
import { PlanList } from "../PlanList";
import type { Me } from "./types";

/** The packages side by side, with the owner's own marked. Packages are changed by the platform, on request. */
export function PlanCards({ me }: { me: Me }) {
  return (
    <section aria-labelledby="paketi-h">
      <h2 id="paketi-h" className="display h-md" style={{ marginBottom: 8 }}>Paket</h2>
      {me.plan === "free" && (
        <p className="caption" style={{ marginBottom: 12 }}>Trenutno nemate paket: na stranici može biti 1 kombi, bez analitike.</p>
      )}
      <PlanList current={me.plan} />
      <p className="caption" style={{ marginTop: 12 }}>
        Za veći paket javite nam se na <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
      </p>
    </section>
  );
}
