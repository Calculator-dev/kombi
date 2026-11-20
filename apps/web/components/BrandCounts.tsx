import { brandName, type BrandId } from "@kombi/shared";
import { BrandLogo } from "./BrandLogo";

/** "4 Ford · 2 Toyota · 5 VW": each make's logo with how many vehicles. Optionally each is a link or button. */
export function BrandCounts({
  brands,
  href,
  active,
  onPick,
}: {
  brands: { id: BrandId; count: number }[];
  href?: (id: BrandId) => string;
  active?: string;
  onPick?: (id: BrandId) => void;
}) {
  if (!brands.length) return null;
  return (
    <ul className="brand-counts">
      {brands.map(({ id, count }) => {
        const inner = (
          <>
            <BrandLogo brand={id} size={22} title="" />
            <span>{brandName(id)}</span>
            <b>{count}</b>
          </>
        );
        return (
          <li key={id}>
            {onPick ? (
              <button type="button" aria-pressed={active === id} onClick={() => onPick(id)}>{inner}</button>
            ) : href ? (
              <a href={href(id)}>{inner}</a>
            ) : (
              <span className="brand-count">{inner}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
