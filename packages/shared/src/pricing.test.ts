import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, quote, todayIn, eachDate, type Settings } from "./index";

const settings: Settings = structuredClone(DEFAULT_SETTINGS);

describe("quote", () => {
  it("charges return date minus pickup date", () => {
    const q = quote({ start: "2026-10-21", end: "2026-10-24" }, settings);
    expect(q.days).toBe(3);
    expect(q.total).toBe(360);
    expect(q.errors).toEqual([]);
  });

  it("applies the weekly discount from 7 days", () => {
    const q = quote({ start: "2026-11-01", end: "2026-11-08" }, settings);
    expect(q.days).toBe(7);
    expect(q.rentalSubtotal).toBe(840);
    expect(q.discount).toBe(84);
    expect(q.total).toBe(756);
  });

  it("prices each day by its own season", () => {
    const q = quote({ start: "2026-06-29", end: "2026-07-03" }, settings);
    // 29, 30 June at 120; 1, 2 July at 150
    expect(q.rentalSubtotal).toBe(2 * 120 + 2 * 150);
    expect(q.rentalLines).toHaveLength(2);
  });

  it("enforces the seasonal minimum", () => {
    const q = quote({ start: "2026-07-10", end: "2026-07-11" }, settings);
    expect(q.errors[0]).toMatch(/najmanje 3 dana/);
  });

  it("adds per-day and flat extras and the pickup fee", () => {
    const q = quote(
      { start: "2026-10-21", end: "2026-10-24", extras: ["childSeat", "crossBorder"], pickup: "airport" },
      settings,
    );
    expect(q.total).toBe(360 + 30 + 50 + 30);
  });

  it("supports seasons that wrap over new year", () => {
    const s: Settings = { ...settings, seasons: [{ name: "Praznici", from: "12-20", to: "01-05", dailyRate: 200 }] };
    expect(quote({ start: "2026-12-31", end: "2027-01-02" }, s).total).toBe(400);
  });

  it("rejects reversed dates", () => {
    expect(quote({ start: "2026-10-24", end: "2026-10-21" }, settings).errors).toHaveLength(1);
  });
});

describe("dates", () => {
  it("lists inclusive ranges across months", () => {
    expect(eachDate("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  });
  it("formats today in Sarajevo", () => {
    expect(todayIn("Europe/Sarajevo", new Date("2026-10-16T23:30:00Z"))).toBe("2026-10-17");
  });
});
