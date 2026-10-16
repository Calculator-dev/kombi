import { addDays, diffDays, eachDate, isIsoDate, monthDay, type IsoDate } from "./dates";
import type { ExtraId, PickupId, Season, Settings } from "./settings";

export interface QuoteInput {
  start: IsoDate; // pickup day
  end: IsoDate; // return day
  extras?: ExtraId[];
  pickup?: PickupId;
}

export interface QuoteLine {
  label: string;
  amount: number;
}

export interface Quote {
  days: number;
  /** Rental lines grouped by rate, e.g. "3 dana × 120 KM". */
  rentalLines: (QuoteLine & { days: number; rate: number })[];
  rentalSubtotal: number;
  discountPct: number;
  discount: number;
  extraLines: QuoteLine[];
  pickupLine: QuoteLine | null;
  total: number;
  deposit: number;
  minDays: number;
  errors: string[];
}

function inSeason(md: string, season: Season): boolean {
  // Seasons may wrap around the new year, e.g. 12-20 → 01-05.
  return season.from <= season.to
    ? md >= season.from && md <= season.to
    : md >= season.from || md <= season.to;
}

export function seasonFor(date: IsoDate, settings: Settings): Season | undefined {
  const md = monthDay(date);
  return settings.seasons.find((s) => inSeason(md, s));
}

export function rateFor(date: IsoDate, settings: Settings): number {
  return seasonFor(date, settings)?.dailyRate ?? settings.dailyRate;
}

/** Minimum rental length for a booking starting on this date. */
export function minDaysFor(start: IsoDate, settings: Settings): number {
  return Math.max(settings.minDays, seasonFor(start, settings)?.minDays ?? 1);
}

export function dayWord(n: number): string {
  return n % 10 === 1 && n % 100 !== 11 ? "dan" : "dana";
}

/**
 * Calculates the price of a rental. Days charged = return date − pickup date,
 * and each charged day uses the rate of its own date (so a trip that runs into
 * the summer season is priced fairly). The same function runs in the browser
 * (instant price) and on the server (the price that is stored).
 */
export function quote(input: QuoteInput, settings: Settings): Quote {
  const errors: string[] = [];
  const empty: Quote = {
    days: 0,
    rentalLines: [],
    rentalSubtotal: 0,
    discountPct: 0,
    discount: 0,
    extraLines: [],
    pickupLine: null,
    total: 0,
    deposit: settings.deposit,
    minDays: settings.minDays,
    errors,
  };
  if (!isIsoDate(input.start) || !isIsoDate(input.end)) {
    errors.push("Neispravan datum.");
    return empty;
  }
  const days = diffDays(input.start, input.end);
  if (days < 1) {
    errors.push("Datum povratka mora biti nakon datuma preuzimanja.");
    return empty;
  }

  const minDays = minDaysFor(input.start, settings);
  if (days < minDays) errors.push(`U ovom periodu najam traje najmanje ${minDays} ${dayWord(minDays)}.`);
  if (days > settings.maxDays) errors.push(`Najduži najam preko stranice je ${settings.maxDays} dana. Za duže, pišite nam.`);

  const byRate = new Map<number, number>();
  for (const date of eachDate(input.start, addDays(input.end, -1))) {
    const rate = rateFor(date, settings);
    byRate.set(rate, (byRate.get(rate) ?? 0) + 1);
  }
  const rentalLines = [...byRate.entries()].map(([rate, n]) => ({
    label: `${n} ${dayWord(n)} × ${rate} KM`,
    days: n,
    rate,
    amount: n * rate,
  }));
  const rentalSubtotal = rentalLines.reduce((sum, l) => sum + l.amount, 0);
  const discountPct = days >= 7 ? settings.weeklyDiscountPct : 0;
  const discount = Math.round((rentalSubtotal * discountPct) / 100);

  const extraLines: QuoteLine[] = [];
  for (const id of new Set(input.extras ?? [])) {
    const extra = settings.extras[id];
    if (!extra || !extra.enabled) continue;
    const amount = extra.perDay !== undefined ? extra.perDay * days : (extra.flat ?? 0);
    extraLines.push({ label: extra.label, amount });
  }

  let pickupLine: QuoteLine | null = null;
  if (input.pickup) {
    const p = settings.pickup[input.pickup];
    if (!p || !p.enabled) errors.push("Odabrano mjesto preuzimanja nije dostupno.");
    else if (p.fee > 0) pickupLine = { label: p.label, amount: p.fee };
  }

  const total =
    rentalSubtotal - discount + extraLines.reduce((s, l) => s + l.amount, 0) + (pickupLine?.amount ?? 0);

  return {
    days,
    rentalLines,
    rentalSubtotal,
    discountPct,
    discount,
    extraLines,
    pickupLine,
    total,
    deposit: settings.deposit,
    minDays,
    errors,
  };
}

/** Converts KM to euro at the fixed currency-board rate. */
export const KM_PER_EUR = 1.95583;
export function kmToEur(km: number): number {
  return Math.round(km / KM_PER_EUR);
}
