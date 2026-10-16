import type { IsoDate } from "@kombi/shared";

export const MONTHS = ["Januar", "Februar", "Mart", "April", "Maj", "Juni", "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar"];
const WEEKDAYS = ["Ned", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub"];

/** "Sri 21.10." */
export function shortDate(date: IsoDate): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[wd]} ${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.`;
}

/** "21. oktobar 2026" */
export function longDate(date: IsoDate): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return `${d}. ${MONTHS[m - 1]!.toLowerCase()} ${y}`;
}

export const km = (n: number) => `${n.toLocaleString("bs-BA")} KM`;
