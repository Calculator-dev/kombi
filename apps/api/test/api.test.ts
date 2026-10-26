import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config";
import { createDb, type Db } from "../src/db";
import type { Notifier } from "../src/services/notify";
import { memoryStorage } from "../src/services/storage";

// Runs on in-memory PGlite by default. Set TEST_DATABASE_URL to an EMPTY PostgreSQL
// database to run the same tests against real Postgres (CI does both).
const NOW = new Date("2026-10-16T10:00:00Z");
const SUPABASE_URL = "https://test-project.supabase.co";

let db: Db;
let app: ReturnType<typeof createApp>;
let sign: (sub: string, email: string) => Promise<string>;
const storage = memoryStorage();
const sent: string[] = [];

// Supabase user ids of the people in these tests.
const ADMIN = { id: "00000000-0000-4000-8000-000000000001", email: "admin@kombi.ba" };
const AMIR = { id: "00000000-0000-4000-8000-000000000002", email: "amir@example.com" };
const BELMA = { id: "00000000-0000-4000-8000-000000000003", email: "belma@example.com" };

let firstVanId: string;

const booking = (over: Record<string, unknown> = {}) => ({
  vanId: firstVanId,
  start: "2026-10-21",
  end: "2026-10-24",
  extras: ["crossBorder"],
  pickup: "office",
  name: "Amra Hodžić",
  email: "amra@example.com",
  phone: "+387 61 123 456",
  contactChannel: "viber",
  acceptTerms: true,
  ...over,
});

const van = (over: Record<string, unknown> = {}) => ({
  name: "Mercedes Vito",
  year: 2022,
  seats: 9,
  fuel: "Dizel",
  gearbox: "Automatski",
  location: "Mostar",
  ...over,
});

beforeAll(async () => {
  db = await createDb({ url: process.env.TEST_DATABASE_URL, dataDir: null });
  const config = loadConfig({ NODE_ENV: "test", SUPABASE_URL, PLATFORM_ADMIN_EMAILS: ADMIN.email });

  // Stand-in for Supabase Auth: our own key pair signs the login tokens.
  const { publicKey, privateKey } = await generateKeyPair("ES256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "test", alg: "ES256" };
  sign = (sub, email) =>
    new SignJWT({ email, role: "authenticated" })
      .setProtectedHeader({ alg: "ES256", kid: "test" })
      .setSubject(sub)
      .setIssuer(`${SUPABASE_URL}/auth/v1`)
      .setAudience("authenticated")
      .setExpirationTime("1h")
      .sign(privateKey);

  const notifier: Notifier = {
    bookingRequested: async (b, owner) => void sent.push(`requested:${b.ref}:${owner ?? "platform"}`),
    bookingConfirmed: async (b) => void sent.push(`confirmed:${b.ref}`),
  };
  app = createApp({ db, config, notifier, storage, now: () => NOW, authKeys: createLocalJWKSet({ keys: [jwk] }) });
  firstVanId = (await request(app).get("/api/vans").expect(200)).body[0].id;
});

afterAll(async () => {
  await db.close();
});

/** Requests as a logged-in user. */
async function as(who: { id: string; email: string }) {
  const token = `Bearer ${await sign(who.id, who.email)}`;
  return {
    get: (url: string) => request(app).get(url).set("Authorization", token),
    post: (url: string) => request(app).post(url).set("Authorization", token),
    put: (url: string) => request(app).put(url).set("Authorization", token),
    patch: (url: string) => request(app).patch(url).set("Authorization", token),
    delete: (url: string) => request(app).delete(url).set("Authorization", token),
  };
}

async function photo(): Promise<Buffer> {
  return sharp({ create: { width: 2400, height: 1600, channels: 3, background: "#d33" } }).jpeg().toBuffer();
}

describe("public API", () => {
  it("lists the van the site started with", async () => {
    const res = await request(app).get("/api/vans").expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ slug: "toyota-proace-verso", dailyRate: 120, seats: 9 });
    const one = await request(app).get("/api/vans/toyota-proace-verso").expect(200);
    expect(one.body.pricing.dailyRate).toBe(120);
  });

  it("quotes a rental", async () => {
    const res = await request(app)
      .post("/api/quote")
      .send({ vanId: firstVanId, start: "2026-10-21", end: "2026-10-24", extras: ["childSeat"], pickup: "airport" })
      .expect(200);
    expect(res.body.total).toBe(360 + 30 + 30);
  });

  it("creates a pending booking that holds its dates", async () => {
    const res = await request(app).post("/api/bookings").send(booking()).expect(201);
    expect(res.body.ref).toBe("KB-2026-0001");
    expect(res.body.total).toBe(410);
    expect(sent).toContain("requested:KB-2026-0001:platform");

    const av = await request(app).get("/api/vans/toyota-proace-verso/availability?from=2026-10-01&to=2026-10-31").expect(200);
    expect(av.body.unavailable).toEqual(["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"]);
    // No personal data in the public calendar
    expect(JSON.stringify(av.body)).not.toContain("Amra");
  });

  it("shows which vans are free for chosen dates", async () => {
    const res = await request(app).get("/api/vans?start=2026-10-22&end=2026-10-25").expect(200);
    expect(res.body[0]).toMatchObject({ available: false, quote: { days: 3, total: 360 } });
    const free = await request(app).get("/api/vans?start=2026-11-02&end=2026-11-05").expect(200);
    expect(free.body[0].available).toBe(true);
  });

  it("rejects overlapping dates", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .send(booking({ start: "2026-10-24", end: "2026-10-26" }))
      .expect(409);
    expect(res.body.error).toBe("dates_taken");
  });

  it("lets only one of two simultaneous requests take the same dates", async () => {
    const [a, b] = await Promise.all([
      request(app).post("/api/bookings").send(booking({ start: "2026-12-10", end: "2026-12-12" })),
      request(app).post("/api/bookings").send(booking({ start: "2026-12-11", end: "2026-12-13" })),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });

  it("validates input", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .send(booking({ start: "2026-11-02", end: "2026-11-04", email: "nope", acceptTerms: false, pickup: "address" }))
      .expect(400);
    expect(Object.keys(res.body.fields)).toEqual(expect.arrayContaining(["email", "acceptTerms", "pickupAddress"]));
  });

  it("rejects past dates and unknown vans", async () => {
    await request(app).post("/api/bookings").send(booking({ start: "2026-10-10", end: "2026-10-12" })).expect(400);
    await request(app).post("/api/bookings").send(booking({ vanId: "00000000-0000-4000-8000-00000000dead" })).expect(404);
  });

  it("silently ignores spam (honeypot)", async () => {
    await request(app)
      .post("/api/bookings")
      .send(booking({ start: "2026-12-01", end: "2026-12-03", website: "x" }))
      .expect(201); // looks accepted to the bot, but nothing is stored
    const av = await request(app).get("/api/vans/toyota-proace-verso/availability?from=2026-12-01&to=2026-12-05").expect(200);
    expect(av.body.unavailable).toEqual([]);
  });
});

describe("logins", () => {
  it("requires a valid Supabase token", async () => {
    await request(app).get("/api/admin/me").expect(401);
    await request(app).get("/api/admin/me").set("Authorization", "Bearer not-a-token").expect(401);
  });

  it("makes listed emails admins and everyone else pending owners", async () => {
    const admin = await (await as(ADMIN)).get("/api/admin/me").expect(200);
    expect(admin.body).toMatchObject({ role: "admin", status: "approved" });
    const amir = await (await as(AMIR)).get("/api/admin/me").expect(200);
    expect(amir.body).toMatchObject({ role: "owner", status: "pending" });
    await (await as(AMIR)).get("/api/admin/users").expect(403);
  });
});

describe("owners and vans", () => {
  let amirVan: string;

  it("asks for a profile before the first van", async () => {
    const amir = await as(AMIR);
    await amir.post("/api/admin/vans").send(van()).expect(400);
    await amir.put("/api/admin/me").send({ name: "Amir Prijevoz", phone: "+387 62 111 222" }).expect(200);
    const created = await amir.post("/api/admin/vans").send(van()).expect(201);
    expect(created.body).toMatchObject({ slug: "mercedes-vito", status: "draft", ownerId: AMIR.id });
    amirVan = created.body.id;
  });

  it("uploads photos: resized, as WebP, with a thumbnail", async () => {
    const amir = await as(AMIR);
    const res = await amir.post(`/api/admin/vans/${amirVan}/photos`).attach("photo", await photo(), "van.jpg").expect(201);
    expect(res.body.photos).toHaveLength(1);
    const p = res.body.photos[0];
    expect([p.width, p.height]).toEqual([1600, 1067]);
    const key = p.url.replace("/api/dev-photos/", "");
    expect((await sharp(storage.files.get(key)!).metadata()).format).toBe("webp");
    await amir.post(`/api/admin/vans/${amirVan}/photos`).attach("photo", Buffer.from("not an image"), "x.jpg").expect(400);
  });

  it("keeps a pending owner's published van off the site until approved", async () => {
    const amir = await as(AMIR);
    await amir.patch(`/api/admin/vans/${amirVan}/status`).send({ status: "published" }).expect(200);
    expect((await request(app).get("/api/vans")).body).toHaveLength(1);
    await request(app).get("/api/vans/mercedes-vito").expect(404);

    await (await as(ADMIN)).patch(`/api/admin/users/${AMIR.id}`).send({ status: "approved" }).expect(200);
    const list = (await request(app).get("/api/vans")).body;
    expect(list.map((v: { slug: string }) => v.slug)).toContain("mercedes-vito");
  });

  it("books each van on its own calendar and tells its owner", async () => {
    // Same dates as the first booking on the other van: no conflict.
    const res = await request(app).post("/api/bookings").send(booking({ vanId: amirVan })).expect(201);
    expect(sent).toContain(`requested:${res.body.ref}:${AMIR.email}`);
  });

  it("never shows or changes another owner's vans, bookings or blocks", async () => {
    const belma = await as(BELMA);
    await belma.put("/api/admin/me").send({ name: "Belma", phone: "+387 61 999 888" }).expect(200);
    expect((await belma.get("/api/admin/vans").expect(200)).body).toEqual([]);
    expect((await belma.get("/api/admin/bookings").expect(200)).body).toEqual([]);
    await belma.get(`/api/admin/vans/${amirVan}`).expect(404);
    await belma.put(`/api/admin/vans/${amirVan}`).send(van({ name: "Ukradeno" })).expect(404);
    await belma.put(`/api/admin/vans/${amirVan}/pricing`).send({}).expect(404);
    await belma.put(`/api/admin/vans/${amirVan}/terms`).send({}).expect(404);
    await belma.delete(`/api/admin/vans/${amirVan}`).expect(404);
    await belma.post(`/api/admin/vans/${amirVan}/photos`).attach("photo", await photo(), "x.jpg").expect(404);
    await belma.post("/api/admin/blocks").send({ vanId: amirVan, start: "2026-11-01", end: "2026-11-02" }).expect(404);

    const amir = await as(AMIR);
    const amirBooking = (await amir.get("/api/admin/bookings").expect(200)).body[0];
    expect(amirBooking.vanName).toBe("Mercedes Vito");
    await belma.patch(`/api/admin/bookings/${amirBooking.id}`).send({ status: "cancelled" }).expect(404);
    const block = await amir.post("/api/admin/blocks").send({ vanId: amirVan, start: "2026-11-01", end: "2026-11-02" }).expect(201);
    await belma.delete(`/api/admin/blocks/${block.body.id}`).expect(404);
    expect((await belma.get("/api/admin/blocks")).body).toEqual([]);

    // Amir sees only his own bookings, not the platform van's.
    const refs = (await amir.get("/api/admin/bookings")).body.map((b: { vanId: string }) => b.vanId);
    expect(new Set(refs)).toEqual(new Set([amirVan]));
  });

  it("gives each van its own rental terms", async () => {
    const amir = await as(AMIR);
    const before = (await request(app).get("/api/vans/mercedes-vito").expect(200)).body.terms;
    expect(before.minDriverAge).toBe(21); // defaults until the owner changes them
    await amir.put(`/api/admin/vans/${amirVan}/terms`).send({ ...before, minDriverAge: 25, included: ["Osiguranje"] }).expect(200);
    await amir.put(`/api/admin/vans/${amirVan}/terms`).send({ ...before, minDriverAge: 12 }).expect(400);
    expect((await request(app).get("/api/vans/mercedes-vito")).body.terms).toMatchObject({ minDriverAge: 25, included: ["Osiguranje"] });
    expect((await request(app).get("/api/vans/toyota-proace-verso")).body.terms.minDriverAge).toBe(21);
  });

  it("lets an admin manage every van", async () => {
    const admin = await as(ADMIN);
    const vans = (await admin.get("/api/admin/vans").expect(200)).body;
    expect(vans.length).toBeGreaterThanOrEqual(2);
    await admin.put(`/api/admin/vans/${amirVan}`).send(van({ description: "Provjereno." })).expect(200);
  });

  it("refuses to delete a van with bookings and hides suspended owners' vans", async () => {
    const amir = await as(AMIR);
    await amir.delete(`/api/admin/vans/${amirVan}`).expect(409);
    await (await as(ADMIN)).patch(`/api/admin/users/${AMIR.id}`).send({ status: "suspended" }).expect(200);
    await request(app).get("/api/vans/mercedes-vito").expect(404);
    await amir.get("/api/admin/vans").expect(403);
    await (await as(ADMIN)).patch(`/api/admin/users/${AMIR.id}`).send({ status: "approved" }).expect(200);
  });
});

describe("managing bookings", () => {
  it("confirms a booking", async () => {
    const admin = await as(ADMIN);
    const list = await admin.get("/api/admin/bookings").expect(200);
    const first = list.body.find((x: { ref: string }) => x.ref === "KB-2026-0001");
    const res = await admin.patch(`/api/admin/bookings/${first.id}`).send({ status: "confirmed" }).expect(200);
    expect(res.body.status).toBe("confirmed");
    expect(sent).toContain("confirmed:KB-2026-0001");
  });

  it("frees dates when a booking is declined", async () => {
    const created = await request(app).post("/api/bookings").send(booking({ start: "2026-11-10", end: "2026-11-12" }));
    const admin = await as(ADMIN);
    const list = await admin.get("/api/admin/bookings?status=pending").expect(200);
    const b = list.body.find((x: { ref: string }) => x.ref === created.body.ref);
    await admin.patch(`/api/admin/bookings/${b.id}`).send({ status: "declined" }).expect(200);
    const av = await request(app).get("/api/vans/toyota-proace-verso/availability?from=2026-11-01&to=2026-11-30").expect(200);
    expect(av.body.unavailable).toEqual([]);
  });

  it("blocks dates and updates a van's prices", async () => {
    const admin = await as(ADMIN);
    const block = await admin
      .post("/api/admin/blocks")
      .send({ vanId: firstVanId, start: "2026-11-20", end: "2026-11-21", reason: "Servis" })
      .expect(201);
    const av = await request(app).get("/api/vans/toyota-proace-verso/availability?from=2026-11-01&to=2026-11-30").expect(200);
    expect(av.body.unavailable).toEqual(["2026-11-20", "2026-11-21"]);
    await request(app).post("/api/bookings").send(booking({ start: "2026-11-21", end: "2026-11-23" })).expect(409);
    await admin.delete(`/api/admin/blocks/${block.body.id}`).expect(204);

    const pricing = (await admin.get(`/api/admin/vans/${firstVanId}`).expect(200)).body.pricing;
    await admin.put(`/api/admin/vans/${firstVanId}/pricing`).send({ ...pricing, dailyRate: 140 }).expect(200);
    expect((await request(app).get("/api/vans/toyota-proace-verso")).body.pricing.dailyRate).toBe(140);
    await admin.put(`/api/admin/vans/${firstVanId}/pricing`).send({ ...pricing, dailyRate: -5 }).expect(400);
  });

  it("books options the owner added", async () => {
    const admin = await as(ADMIN);
    const pricing = (await admin.get(`/api/admin/vans/${firstVanId}`).expect(200)).body.pricing;
    await admin
      .put(`/api/admin/vans/${firstVanId}/pricing`)
      .send({
        ...pricing,
        extras: [...pricing.extras, { id: "roofRack", label: "Krovni nosač", flat: 25, enabled: true }],
        pickup: [...pricing.pickup, { id: "bus", label: "Autobuska stanica", fee: 20, detailsLabel: "Broj linije", enabled: true }],
      })
      .expect(200);

    const missing = await request(app)
      .post("/api/bookings")
      .send(booking({ start: "2026-12-01", end: "2026-12-03", extras: ["roofRack"], pickup: "bus" }))
      .expect(400);
    expect(Object.keys(missing.body.fields)).toContain("pickupAddress");

    const res = await request(app)
      .post("/api/bookings")
      .send(booking({ start: "2026-12-01", end: "2026-12-03", extras: ["roofRack"], pickup: "bus", pickupAddress: "Linija 31" }))
      .expect(201);
    expect(res.body.total).toBe(2 * 140 + 25 + 20);
  });
});

describe("search (/kombiji)", () => {
  const slugs = (res: { body: { items: { slug: string }[] } }) => res.body.items.map((v) => v.slug);

  beforeAll(async () => {
    const admin = await as(ADMIN);
    await admin.put("/api/admin/me").send({ name: "kombi.ba", phone: "+387 33 000 000" }).expect(200);
    const add = async (details: Record<string, unknown>, dailyRate: number) => {
      const v = (await admin.post("/api/admin/vans").send(van(details)).expect(201)).body;
      await admin.put(`/api/admin/vans/${v.id}/pricing`).send({ ...v.pricing, dailyRate }).expect(200);
      await admin.post(`/api/admin/vans/${v.id}/photos`).attach("photo", await photo(), "v.jpg").expect(201);
      await admin.patch(`/api/admin/vans/${v.id}/status`).send({ status: "published" }).expect(200);
      return v.id as string;
    };
    await add({ name: "Ford Transit 15", seats: 15, luggage: 10, gearbox: "Manuelni", location: "Tuzla", year: 2019, features: ["ac", "towbar"] }, 200);
    await add({ name: "VW Caravelle", seats: 9, luggage: 6, gearbox: "Automatski", location: "Sarajevo", year: 2025, features: ["ac", "isofix", "carplay"] }, 160);
    await add({ name: "Renault Trafic", seats: 9, luggage: 3, gearbox: "Manuelni", location: "Mostar", year: 2021, features: [] }, 95);
  });

  it("lists every public van, cheapest first, with the cities", async () => {
    const res = await request(app).get("/api/search").expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(5);
    const rates = res.body.items.map((v: { dailyRate: number }) => v.dailyRate);
    expect(rates).toEqual([...rates].sort((a, b) => a - b));
    expect(res.body.cities).toEqual(expect.arrayContaining(["Mostar", "Sarajevo", "Tuzla"]));
  });

  it("filters by seats, suitcases, gearbox, city, year and price", async () => {
    expect(slugs(await request(app).get("/api/search?seats=12"))).toEqual(["ford-transit-15"]);
    expect(slugs(await request(app).get("/api/search?luggage=6&gearbox=Automatski"))).toEqual(["vw-caravelle"]);
    const mostar = await request(app).get("/api/search?city=mostar");
    expect(slugs(mostar)).toContain("renault-trafic");
    expect(mostar.body.items.every((v: { location: string }) => v.location === "Mostar")).toBe(true);
    expect(slugs(await request(app).get("/api/search?yearMin=2025&priceMax=170"))).toEqual(["vw-caravelle"]);
    expect(slugs(await request(app).get("/api/search?priceMin=150&priceMax=210&sort=daily"))).toEqual(["vw-caravelle", "ford-transit-15"]);
  });

  it("requires every chosen piece of equipment", async () => {
    expect(slugs(await request(app).get("/api/search?features=ac"))).toEqual(["vw-caravelle", "ford-transit-15"]);
    expect(slugs(await request(app).get("/api/search?features=ac,isofix"))).toEqual(["vw-caravelle"]);
  });

  it("sorts by seats and by year", async () => {
    expect(slugs(await request(app).get("/api/search?seats=9&sort=seats"))[0]).toBe("ford-transit-15");
    expect(slugs(await request(app).get("/api/search?sort=newest"))[0]).toBe("vw-caravelle");
  });

  it("with dates: prices each van, hides taken ones unless asked", async () => {
    const caravelle = (await request(app).get("/api/vans/vw-caravelle")).body.id;
    await request(app).post("/api/bookings").send(booking({ vanId: caravelle, start: "2027-03-02", end: "2027-03-05" })).expect(201);
    const res = await request(app).get("/api/search?start=2027-03-03&end=2027-03-06&seats=9").expect(200);
    expect(slugs(res)).not.toContain("vw-caravelle");
    expect(res.body.free).toBe(res.body.total);
    expect(res.body.items.find((v: { slug: string }) => v.slug === "renault-trafic").quote).toMatchObject({ days: 3, total: 285 });

    const all = await request(app).get("/api/search?start=2027-03-03&end=2027-03-06&seats=9&taken=1").expect(200);
    expect(slugs(all).at(-1)).toBe("vw-caravelle"); // taken vans come last
    expect(all.body.free).toBe(all.body.total - 1);
  });

  it("ignores nonsense in the address instead of failing", async () => {
    const res = await request(app).get("/api/search?seats=abc&gearbox=Rucni&features=wings&start=2027-01-05&end=2027-01-01").expect(200);
    expect(res.body.total).toBeGreaterThanOrEqual(5);
    expect(res.body.items[0].quote).toBeUndefined();
  });
});
