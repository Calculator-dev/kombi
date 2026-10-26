/**
 * Events for Google Tag Manager (window.dataLayer). Names follow GA4's
 * recommended events where one fits, so GA4 reports work out of the box.
 * Never put names, emails or phone numbers in here.
 */
type Params = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function track(event: string, params: Params = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

export interface TrackedVan {
  id: string;
  slug: string;
  name: string;
  seats: number;
  location: string;
  dailyRate: number;
}

const item = (v: TrackedVan, price?: number, index?: number) => ({
  item_id: v.slug,
  item_name: v.name,
  item_category: `${v.seats} sjedišta`,
  item_category2: v.location,
  price: price ?? v.dailyRate,
  quantity: 1,
  index,
});

/** GA4 e-commerce events: the previous `ecommerce` object is cleared first, as Google recommends. */
export function trackEcommerce(event: string, vans: TrackedVan[], extra: Params & { value?: number; prices?: number[] } = {}) {
  const { prices, ...rest } = extra;
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
  track(event, {
    ...rest,
    ecommerce: {
      currency: "BAM",
      value: extra.value,
      items: vans.map((v, i) => item(v, prices?.[i], vans.length > 1 ? i : undefined)),
      ...(rest.transaction_id ? { transaction_id: rest.transaction_id } : {}),
    },
  });
}
