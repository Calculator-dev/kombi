import { brandName } from "@kombi/shared";
import { BRAND_PATHS } from "@/lib/brandLogos";

/**
 * A make's logo in the text colour (so it suits both themes), or its initials
 * in a circle when there is no logo for it.
 */
export function BrandLogo({ brand, size = 24, title }: { brand: string | null | undefined; size?: number; title?: string }) {
  if (!brand) return null;
  const name = brandName(brand);
  const path = BRAND_PATHS[brand];
  const label = title ?? name;
  if (path) {
    return (
      <svg className="brand-logo" width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label}>
        <title>{label}</title>
        <path d={path} fill="currentColor" />
      </svg>
    );
  }
  const initials = name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="brand-logo brand-initials" style={{ width: size, height: size, fontSize: size * 0.38 }} role="img" aria-label={label} title={label}>
      {initials || "?"}
    </span>
  );
}
