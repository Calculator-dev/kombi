/**
 * Packages for van owners. Everyone starts on "free": one published van and one
 * published car. Paid packages count all vehicles together (vans and cars) and
 * open the analytics. A platform admin sets an owner's package (there is no
 * online payment).
 */
export const PLANS = ["free", "bronze", "silver", "gold"] as const;
export type Plan = (typeof PLANS)[number];

export interface PlanInfo {
  label: string;
  /** KM per month. */
  price: number;
  /** Published vehicles allowed: "each" counts vans and cars apart, "total" together; null = no limit. */
  limit: { each: number } | { total: number } | null;
  analytics: boolean;
}

export const PLAN_INFO: Record<Plan, PlanInfo> = {
  free: { label: "Free", price: 0, limit: { each: 1 }, analytics: false },
  bronze: { label: "Bronze", price: 29, limit: { total: 6 }, analytics: true },
  silver: { label: "Silver", price: 69, limit: { total: 20 }, analytics: true },
  gold: { label: "Gold", price: 149, limit: null, analytics: true },
};

/** New partners use any package free of charge for this many days. */
export const FREE_TRIAL_DAYS = 90;

export const vansWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "kombi" : "kombija");
export const carsWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "auto" : "auta");
/** "1 kombi i 1 auto", "do 6 vozila", "neograničen broj vozila". */
export const planVans = (plan: Plan) => {
  const l = PLAN_INFO[plan].limit;
  if (!l) return "neograničen broj vozila";
  if ("each" in l) return `${l.each} ${vansWord(l.each)} i ${l.each} ${carsWord(l.each)}`;
  return `do ${l.total} vozila`;
};

/** Whether a package allows this many published vans and cars at once. */
export function planAllows(plan: Plan, live: { van: number; car: number }): boolean {
  const l = PLAN_INFO[plan].limit;
  if (!l) return true;
  if ("each" in l) return live.van <= l.each && live.car <= l.each;
  return live.van + live.car <= l.total;
}

/** Numbers for the owner's analytics page. */
export interface AnalyticsReport {
  from: string;
  to: string;
  /** One entry per day, oldest first. */
  days: { day: string; views: number; checkouts: number; requests: number }[];
  vans: { id: string; name: string; views: number; checkouts: number; requests: number; confirmed: number; revenue: number }[];
  totals: { views: number; checkouts: number; requests: number; confirmed: number; revenue: number };
}
