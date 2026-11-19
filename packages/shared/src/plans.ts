/**
 * Packages for van owners. Everyone starts on "free" with one published van
 * and one published car; a paid package raises both numbers (the same limit
 * for each) and opens the analytics. A platform admin
 * sets an owner's package (there is no online payment).
 */
export const PLANS = ["free", "bronze", "silver", "gold"] as const;
export type Plan = (typeof PLANS)[number];

export const PLAN_INFO: Record<Plan, { label: string; /** Published vans allowed, and as many cars; null = no limit. */ maxVans: number | null; analytics: boolean }> = {
  free: { label: "Osnovni", maxVans: 1, analytics: false },
  bronze: { label: "Bronze", maxVans: 3, analytics: true },
  silver: { label: "Silver", maxVans: 10, analytics: true },
  gold: { label: "Gold", maxVans: null, analytics: true },
};

export const vansWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "kombi" : "kombija");
export const carsWord = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? "auto" : "auta");
/** "3 kombija i 3 auta". */
export const planVans = (plan: Plan) => {
  const max = PLAN_INFO[plan].maxVans;
  return max === null ? "neograničen broj kombija i auta" : `${max} ${vansWord(max)} i ${max} ${carsWord(max)}`;
};

/** Numbers for the owner's analytics page. */
export interface AnalyticsReport {
  from: string;
  to: string;
  /** One entry per day, oldest first. */
  days: { day: string; views: number; checkouts: number; requests: number }[];
  vans: { id: string; name: string; views: number; checkouts: number; requests: number; confirmed: number; revenue: number }[];
  totals: { views: number; checkouts: number; requests: number; confirmed: number; revenue: number };
}
