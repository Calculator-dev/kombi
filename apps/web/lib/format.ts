import type { IsoDate } from "@kombi/shared";
import { dict, type Locale } from "./i18n";

export const MONTHS = dict("bs").months;

/** "Sri 21.10." / "Wed 21.10." */
export function shortDate(date: IsoDate, locale: Locale = "bs"): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${dict(locale).weekdaysShort[wd]} ${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.`;
}

/** "21. oktobar 2026" */
export function longDate(date: IsoDate): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return `${d}. ${MONTHS[m - 1]!.toLowerCase()} ${y}`;
}

export const km = (n: number) => `${n.toLocaleString("bs-BA")} KM`;
