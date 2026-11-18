import { describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/config";
import type { Booking } from "../src/services/bookings";
import { createNotifier } from "../src/services/notify";

const booking = {
  ref: "KB-2026-0001",
  vanName: "Toyota Proace Verso",
  start: "2026-12-01",
  end: "2026-12-04",
  total: 360,
  name: "Amra Hodžić",
  email: "amra@example.com",
  phone: "+38761111222",
  contactChannel: "viber",
  pickup: "office",
  pickupAddress: null,
  pickupTime: null,
  notes: null,
  contractToken: "a".repeat(64),
  quote: { onRequest: false, days: 3, extraLines: [], deposit: 300 },
} as unknown as Booking;

function setup(status = 200) {
  const config = loadConfig({ NODE_ENV: "test", RESEND_API_KEY: "re_test", OWNER_EMAIL: "platforma@example.com", WEB_ORIGIN: "https://kombi.ba" });
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init! });
    return new Response(JSON.stringify(status === 200 ? { id: "x" } : { message: "The kombi.ba domain is not verified." }), { status });
  }) as unknown as typeof fetch;
  return { notifier: createNotifier(config, fetchImpl), calls };
}

describe("emails through Resend", () => {
  it("sends the request to the owner and the platform, and a receipt to the customer", async () => {
    const { notifier, calls } = setup();
    await notifier.bookingRequested(booking, "vlasnik@example.com");
    expect(calls).toHaveLength(2);
    expect(calls[0]!.url).toBe("https://api.resend.com/emails");
    expect((calls[0]!.init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    const toOwner = JSON.parse(String(calls[0]!.init.body));
    expect(toOwner).toMatchObject({ from: "kombi.ba <rezervacije@kombi.ba>", to: ["vlasnik@example.com", "platforma@example.com"] });
    expect(toOwner.text).toContain("https://kombi.ba/admin");
    expect(JSON.parse(String(calls[1]!.init.body)).to).toEqual(["amra@example.com"]);
  });

  it("puts the contract link in the confirmation", async () => {
    const { notifier, calls } = setup();
    await notifier.bookingConfirmed(booking);
    const mail = JSON.parse(String(calls[0]!.init.body));
    expect(mail.to).toEqual(["amra@example.com"]);
    expect(mail.text).toContain(`https://kombi.ba/ugovor/${"a".repeat(64)}`);
  });

  it("logs a refused email instead of failing the booking", async () => {
    const { notifier } = setup(403);
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(notifier.bookingConfirmed(booking)).resolves.toBeUndefined();
    expect(String(error.mock.calls[0]![1])).toContain("domain is not verified");
    error.mockRestore();
  });
});
