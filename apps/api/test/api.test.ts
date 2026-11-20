import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config";
import { createDb, type Db } from "../src/db";
import { bookings } from "../src/db/schema";
import type { Notifier } from "../src/services/notify";
import { eq } from "drizzle-orm";
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
    reviewRequest: async (b) => void sent.push(`review:${b.ref}`),
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

  it("shows the 360° view only when it's switched on and all 12 photos are in", async () => {
    const amir = await as(AMIR);
    const spin = () => request(app).get("/api/vans/mercedes-vito").then((r) => r.body.spin);
    const on = await amir.patch(`/api/admin/vans/${amirVan}/spin`).send({ enabled: true }).expect(200);
    expect(on.body).toMatchObject({ spinEnabled: true });
    expect(on.body.spinSlots).toEqual(Array(12).fill(null));

    for (let slot = 0; slot < 11; slot++) {
      await amir.put(`/api/admin/vans/${amirVan}/spin/${slot}`).attach("photo", await photo(), "spin.jpg").expect(200);
    }
    expect(await spin()).toBeNull(); // one slot still empty
    const full = await amir.put(`/api/admin/vans/${amirVan}/spin/11`).attach("photo", await photo(), "spin.jpg").expect(200);
    expect(full.body.spinSlots.every(Boolean)).toBe(true);
    // The phone-size copy keeps the whole picture instead of cropping it.
    const thumb = await sharp(storage.files.get(full.body.spinSlots[11].thumbUrl.replace("/api/dev-photos/", ""))!).metadata();
    expect([thumb.width, thumb.height]).toEqual([800, 533]);
    expect(await spin()).toHaveLength(12);

    // Replacing a slot deletes the old file.
    const oldKey = full.body.spinSlots[0].url.replace("/api/dev-photos/", "");
    const replaced = await amir.put(`/api/admin/vans/${amirVan}/spin/0`).attach("photo", await photo(), "spin.jpg").expect(200);
    expect(replaced.body.spinSlots[0].id).not.toBe(full.body.spinSlots[0].id);
    expect(storage.files.has(oldKey)).toBe(false);

    await amir.put(`/api/admin/vans/${amirVan}/spin/12`).attach("photo", await photo(), "spin.jpg").expect(400);
    await (await as(BELMA)).patch(`/api/admin/vans/${amirVan}/spin`).send({ enabled: false }).expect(404);

    // Switching off hides it but keeps the photos; removing one hides it too.
    await amir.patch(`/api/admin/vans/${amirVan}/spin`).send({ enabled: false }).expect(200);
    expect(await spin()).toBeNull();
    await amir.patch(`/api/admin/vans/${amirVan}/spin`).send({ enabled: true }).expect(200);
    expect(await spin()).toHaveLength(12);
    const removed = await amir.delete(`/api/admin/vans/${amirVan}/spin/5`).expect(200);
    expect(removed.body.spinSlots[5]).toBeNull();
    expect(await spin()).toBeNull();
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

describe("deleting a van", () => {
  it("deletes a van whose requests were all declined, but not one with a pending request", async () => {
    const admin = await as(ADMIN);
    await admin.put("/api/admin/me").send({ name: "kombi.ba", phone: "+387 33 000 000" }).expect(200);
    const v = (await admin.post("/api/admin/vans").send(van({ name: "Probni kombi" })).expect(201)).body;
    await admin.post(`/api/admin/vans/${v.id}/photos`).attach("photo", await photo(), "v.jpg").expect(201);
    await admin.patch(`/api/admin/vans/${v.id}/status`).send({ status: "published" }).expect(200);
    await request(app).post("/api/bookings").send(booking({ vanId: v.id, start: "2027-01-10", end: "2027-01-12", extras: [] })).expect(201);
    const [b] = (await admin.get(`/api/admin/bookings?vanId=${v.id}`).expect(200)).body as { id: string }[];

    const refused = await admin.delete(`/api/admin/vans/${v.id}`).expect(409);
    expect(refused.body.message).toContain("na čekanju");

    await admin.patch(`/api/admin/bookings/${b!.id}`).send({ status: "declined" }).expect(200);
    await admin.delete(`/api/admin/vans/${v.id}`).expect(204);
    expect(((await admin.get("/api/admin/vans").expect(200)).body as { id: string }[]).map((x) => x.id)).not.toContain(v.id);
    expect(((await admin.get("/api/admin/bookings").expect(200)).body as { id: string }[]).map((x) => x.id)).not.toContain(b!.id);
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

  it("finds vans by words in the name or city, any case", async () => {
    expect(slugs(await request(app).get("/api/search?q=caravelle"))).toEqual(["vw-caravelle"]);
    expect(slugs(await request(app).get("/api/search?q=tuzla%20FORD"))).toEqual(["ford-transit-15"]);
    expect(slugs(await request(app).get("/api/search?q=sarajevo%20ford"))).toEqual([]);
    expect(slugs(await request(app).get("/api/search?q=100%25"))).toEqual([]);
    expect((await request(app).get("/api/search?q=%20%20")).body.total).toBeGreaterThanOrEqual(5);
  });

  it("filters passenger and cargo vans", async () => {
    const admin = await as(ADMIN);
    const v = (await admin.post("/api/admin/vans").send(van({ name: "Renault Master Furgon", category: "cargo", cargoM3: 12.5, payloadKg: 1300, seats: 3 })).expect(201)).body;
    expect([v.category, v.cargoM3, v.payloadKg]).toEqual(["cargo", 12.5, 1300]);
    await admin.post(`/api/admin/vans/${v.id}/photos`).attach("photo", await photo(), "v.jpg").expect(201);
    await admin.patch(`/api/admin/vans/${v.id}/status`).send({ status: "published" }).expect(200);
    const cargo = await request(app).get("/api/search?type=cargo");
    expect(slugs(cargo)).toEqual(["renault-master-furgon"]);
    expect(cargo.body.items[0]).toMatchObject({ category: "cargo", cargoM3: 12.5, payloadKg: 1300 });
    expect(slugs(await request(app).get("/api/search?type=passenger"))).not.toContain("renault-master-furgon");
    await admin.patch(`/api/admin/vans/${v.id}/status`).send({ status: "draft" }).expect(200);
  });

  it("shows who rents a van out", async () => {
    const res = await request(app).get("/api/vans/vw-caravelle").expect(200);
    expect(res.body.owner).toBe("kombi.ba");
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

describe("packages, analytics and price by agreement", () => {
  let second: string;
  const amirVans = async () => (await (await as(AMIR)).get("/api/admin/vans").expect(200)).body as { id: string; slug: string; pricing: object }[];

  it("lets an owner without a package publish one van only", async () => {
    const amir = await as(AMIR);
    expect((await amir.get("/api/admin/me")).body.plan).toBe("free");
    second = (await amir.post("/api/admin/vans").send(van({ name: "Opel Vivaro" })).expect(201)).body.id;
    await amir.post(`/api/admin/vans/${second}/photos`).attach("photo", await photo(), "v.jpg").expect(201);
    const res = await amir.patch(`/api/admin/vans/${second}/status`).send({ status: "published" }).expect(403);
    expect(res.body.error).toBe("plan_limit");
  });

  it("counts cars separately: the free package also allows one car", async () => {
    const amir = await as(AMIR);
    const addCar = async (name: string) => {
      const id = (await amir.post("/api/admin/vans").send(van({ name, category: "car", seats: 5 })).expect(201)).body.id as string;
      await amir.post(`/api/admin/vans/${id}/photos`).attach("photo", await photo(), "v.jpg").expect(201);
      return id;
    };
    const golf = await addCar("VW Golf");
    await amir.patch(`/api/admin/vans/${golf}/status`).send({ status: "published" }).expect(200);
    const octavia = await addCar("Skoda Octavia");
    expect((await amir.patch(`/api/admin/vans/${octavia}/status`).send({ status: "published" }).expect(403)).body.error).toBe("plan_limit");
    // A published car can't be turned into a van past the van limit either.
    const golfVan = (await amir.get("/api/admin/vans")).body.find((v: { id: string }) => v.id === golf);
    const { name, year, seats, fuel, gearbox, engine, license, location, description, luggage, powerHp, features } = golfVan;
    await amir
      .put(`/api/admin/vans/${golf}`)
      .send({ name, year, seats, fuel, gearbox, engine, license, location, description, luggage, powerHp, features, category: "passenger" })
      .expect(403);
    const cars = (await request(app).get("/api/search?type=car")).body.items.map((v: { slug: string }) => v.slug);
    expect(cars).toEqual(["vw-golf"]);
    for (const id of [golf, octavia]) await amir.delete(`/api/admin/vans/${id}`).expect(204);
  });

  it("publishes more vans on a bigger package, which only an admin can set", async () => {
    const amir = await as(AMIR);
    await amir.patch(`/api/admin/users/${AMIR.id}`).send({ plan: "gold" }).expect(403);
    const res = await (await as(ADMIN)).patch(`/api/admin/users/${AMIR.id}`).send({ plan: "bronze" }).expect(200);
    expect(res.body).toMatchObject({ plan: "bronze", status: "approved" });
    await amir.patch(`/api/admin/vans/${second}/status`).send({ status: "published" }).expect(200);
    // Two vans are live: back to one van is refused until one is hidden.
    await (await as(ADMIN)).patch(`/api/admin/users/${AMIR.id}`).send({ plan: "free" }).expect(409);
  });

  it("counts vans and cars together on a paid package: Bronze allows six vehicles", async () => {
    const amir = await as(AMIR);
    const live = async () => (await amir.get("/api/admin/vans")).body.filter((v: { status: string }) => v.status === "published").length as number;
    const added: string[] = [];
    // Two vans are live already; four cars fill the package.
    while ((await live()) < 6) {
      const id = (await amir.post("/api/admin/vans").send(van({ name: `Auto ${added.length + 1}`, category: "car", seats: 5 })).expect(201)).body.id as string;
      await amir.post(`/api/admin/vans/${id}/photos`).attach("photo", await photo(), "v.jpg").expect(201);
      await amir.patch(`/api/admin/vans/${id}/status`).send({ status: "published" }).expect(200);
      added.push(id);
    }
    expect(added.length).toBe(4);
    const seventh = (await amir.post("/api/admin/vans").send(van({ name: "Opel Movano" })).expect(201)).body.id as string;
    await amir.post(`/api/admin/vans/${seventh}/photos`).attach("photo", await photo(), "v.jpg").expect(201);
    expect((await amir.patch(`/api/admin/vans/${seventh}/status`).send({ status: "published" }).expect(403)).body.error).toBe("plan_limit");
    for (const id of [...added, seventh]) await amir.delete(`/api/admin/vans/${id}`).expect(204);
  });

  it("shows analytics to paying owners only, for their own vans", async () => {
    const belma = await as(BELMA);
    expect((await belma.get("/api/admin/analytics").expect(403)).body.error).toBe("plan_required");

    await request(app).post("/api/vans/mercedes-vito/hit").send({ type: "view" }).expect(204);
    await request(app).post("/api/vans/mercedes-vito/hit").send({ type: "view" }).expect(204);
    await request(app).post("/api/vans/mercedes-vito/hit").send({ type: "checkout" }).expect(204);
    await request(app).post("/api/vans/toyota-proace-verso/hit").send({ type: "view" }).expect(204);
    await request(app).post("/api/vans/mercedes-vito/hit").send({ type: "click" }).expect(400);
    await request(app).post("/api/vans/nema-ga/hit").send({ type: "view" }).expect(404);

    const report = (await (await as(AMIR)).get("/api/admin/analytics?days=7").expect(200)).body;
    expect(report.totals).toMatchObject({ views: 2, checkouts: 1 });
    expect(report.totals.requests).toBeGreaterThanOrEqual(1);
    expect(report.days).toHaveLength(7);
    expect(report.days.at(-1)).toMatchObject({ day: "2026-10-16", views: 2, checkouts: 1 });
    expect(report.vans.map((v: { name: string }) => v.name).sort()).toEqual(["Mercedes Vito", "Opel Vivaro"]);

    const all = (await (await as(ADMIN)).get("/api/admin/analytics").expect(200)).body;
    expect(all.totals.views).toBe(3);
  });

  it("offers a van at a price by agreement: no price shown, no total on the request", async () => {
    const amir = await as(AMIR);
    const v = (await amirVans()).find((x) => x.id === second)!;
    await amir.put(`/api/admin/vans/${second}/pricing`).send({ ...v.pricing, priceOnRequest: true }).expect(200);

    const card = (await request(app).get("/api/search")).body.items.find((c: { id: string }) => c.id === second);
    expect(card.priceOnRequest).toBe(true);
    const cheap = (await request(app).get("/api/search?priceMax=100000")).body.items;
    expect(cheap.map((c: { id: string }) => c.id)).not.toContain(second);
    const sorted = (await request(app).get("/api/search?sort=daily")).body.items;
    expect(sorted.at(-1).id).toBe(second);

    await request(app).post("/api/bookings").send(booking({ vanId: second, start: "2027-03-01", end: "2027-03-04" })).expect(201);
    const [b] = (await amir.get(`/api/admin/bookings?vanId=${second}`).expect(200)).body;
    expect(b).toMatchObject({ total: 0, quote: { onRequest: true, days: 3, rentalLines: [] } });
  });
});

describe("rental contract", () => {
  it("fills the contract from the request, the van's papers and the owner's profile", async () => {
    const amir = await as(AMIR);
    const [mine] = (await amir.get("/api/admin/vans").expect(200)).body as { id: string; contract: { kmPerDay: number } }[];
    expect(mine!.contract.kmPerDay).toBe(500);
    await amir
      .put(`/api/admin/vans/${mine!.id}/contract`)
      .send({ ...mine!.contract, plates: "A12-B-345", vin: "WDF44770313000001", color: "Siva", place: "Mostaru", kmPerDay: 300 })
      .expect(200);
    const me = (await amir.get("/api/admin/me").expect(200)).body;
    await amir
      .put("/api/admin/me")
      .send({ name: me.name, phone: me.phone, address: "Bulevar 1, 88000 Mostar", companyId: "4200000000001" })
      .expect(200);

    await request(app).post("/api/bookings").send(booking({ vanId: mine!.id, start: "2026-12-01", end: "2026-12-04", extras: [], jmb: "123" })).expect(400);
    await request(app)
      .post("/api/bookings")
      .send(
        booking({
          vanId: mine!.id,
          start: "2026-12-01",
          end: "2026-12-04",
          extras: [],
          pickupTime: "09:00",
          address: "Titova 5, Sarajevo",
          jmb: "0101990170001",
          idNumber: "1A234B567",
          licenseNumber: "V1234567",
        }),
      )
      .expect(201);
    const list = (await amir.get(`/api/admin/bookings?vanId=${mine!.id}`).expect(200)).body as { id: string; start: string }[];
    const b = list.find((x) => x.start === "2026-12-01")!;

    const c = (await amir.get(`/api/admin/bookings/${b.id}/contract`).expect(200)).body;
    expect(c.date).toBe("2026-10-16");
    expect(c.lessor).toMatchObject({ address: "Bulevar 1, 88000 Mostar", companyId: "4200000000001", email: AMIR.email });
    expect(c.renter).toMatchObject({ name: "Amra Hodžić", jmb: "0101990170001", idNumber: "1A234B567", licenseNumber: "V1234567", address: "Titova 5, Sarajevo" });
    expect(c.terms).toMatchObject({ plates: "A12-B-345", place: "Mostaru", kmPerDay: 300, damageFee: 500 });
    expect(c).toMatchObject({ start: "2026-12-01", end: "2026-12-04", pickupTime: "09:00", days: 3 });
    expect(c.total).toBeGreaterThan(0);

    // Papers stay out of the public site, and other owners get nothing.
    const pub = JSON.stringify((await request(app).get("/api/vans").expect(200)).body);
    expect(pub).not.toContain("A12-B-345");
    await (await as(BELMA)).get(`/api/admin/bookings/${b.id}/contract`).expect(404);
    await (await as(BELMA)).put(`/api/admin/vans/${mine!.id}/contract`).send(mine!.contract).expect(404);
  });

  it("lets the customer read the contract through the secret link once the booking is confirmed", async () => {
    const amir = await as(AMIR);
    const [mine] = (await amir.get("/api/admin/vans").expect(200)).body as { id: string }[];
    await request(app)
      .post("/api/bookings")
      .send(booking({ vanId: mine!.id, start: "2026-12-10", end: "2026-12-12", extras: [], jmb: "0101990170001" }))
      .expect(201);
    const list = (await amir.get(`/api/admin/bookings?vanId=${mine!.id}`).expect(200)).body as { id: string; start: string; contractToken: string }[];
    const b = list.find((x) => x.start === "2026-12-10")!;
    expect(b.contractToken).toMatch(/^[0-9a-f]{64}$/);
    expect(new Set(list.map((x) => x.contractToken)).size).toBe(list.length);

    // A request that is not confirmed yet has no contract to show.
    await request(app).get(`/api/contracts/${b.contractToken}`).expect(404);
    await amir.patch(`/api/admin/bookings/${b.id}`).send({ status: "confirmed" }).expect(200);

    const res = await request(app).get(`/api/contracts/${b.contractToken}`).expect(200);
    expect(res.headers["cache-control"]).toContain("no-store");
    expect(res.body).toMatchObject({ start: "2026-12-10", end: "2026-12-12", renter: { jmb: "0101990170001" }, lessor: { email: AMIR.email } });

    await request(app).get(`/api/contracts/${"0".repeat(64)}`).expect(404);
    await request(app).get(`/api/contracts/${b.id}`).expect(404);
  });
});

describe("VAT, mileage and reviews", () => {
  it("shows the owner's VAT status and the mileage and damage terms they saved", async () => {
    const amir = await as(AMIR);
    const [mine] = (await amir.get("/api/admin/vans").expect(200)).body as { slug: string }[];
    const before = (await request(app).get(`/api/vans/${mine!.slug}`).expect(200)).body;
    expect(before.vat).toBe(false);
    // Saved in the contract test (the form sends every amount).
    expect(before.limits).toMatchObject({ kmPerDay: 300, damageFee: 500 });
    expect(before.limits.extraKm).toContain("0,35 KM/km");
    // A van whose contract terms were never saved shows none: the sample values aren't the owner's.
    expect((await request(app).get("/api/vans/toyota-proace-verso")).body.limits).toEqual({});
    const me = (await amir.get("/api/admin/me").expect(200)).body;
    await amir.put("/api/admin/me").send({ name: me.name, phone: me.phone, vatRegistered: true }).expect(200);
    expect((await amir.get("/api/admin/me")).body.vatRegistered).toBe(true);
    expect((await request(app).get(`/api/vans/${mine!.slug}`)).body.vat).toBe(true);
    // The platform's own vans: not known.
    expect((await request(app).get("/api/vans/toyota-proace-verso")).body.vat).toBeNull();
  });

  it("lets only a customer with a finished, confirmed rental rate it, once", async () => {
    const admin = await as(ADMIN);
    const created = await request(app).post("/api/bookings").send(booking({ start: "2026-12-20", end: "2026-12-22", extras: [] })).expect(201);
    const b = ((await admin.get("/api/admin/bookings")).body as { id: string; ref: string; reviewToken: string }[]).find((x) => x.ref === created.body.ref)!;
    expect(b.reviewToken).toMatch(/^[0-9a-f]{64}$/);

    // Not confirmed: closed. Confirmed but not over yet: too early.
    expect((await request(app).get(`/api/reviews/${b.reviewToken}`).expect(200)).body.state).toBe("closed");
    await admin.patch(`/api/admin/bookings/${b.id}`).send({ status: "confirmed" }).expect(200);
    expect((await request(app).get(`/api/reviews/${b.reviewToken}`)).body.state).toBe("early");
    await request(app).post(`/api/reviews/${b.reviewToken}`).send({ rating: 5 }).expect(409);
    await admin.post(`/api/admin/bookings/${b.id}/review-request`).expect(409);

    // The rental is over.
    await db.orm.update(bookings).set({ start: "2026-10-10", end: "2026-10-14" }).where(eq(bookings.id, b.id));
    await admin.post(`/api/admin/bookings/${b.id}/review-request`).expect(200);
    expect(sent).toContain(`review:${b.ref}`);
    const ctx = (await request(app).get(`/api/reviews/${b.reviewToken}`)).body;
    expect(ctx).toMatchObject({ state: "open", name: "Amra", vanSlug: "toyota-proace-verso" });
    await request(app).post(`/api/reviews/${b.reviewToken}`).send({ rating: 7 }).expect(400);
    const done = await request(app).post(`/api/reviews/${b.reviewToken}`).send({ rating: 4, comment: "Čist kombi, ljubazan vlasnik." }).expect(201);
    expect(done.body.state).toBe("done");
    await request(app).post(`/api/reviews/${b.reviewToken}`).send({ rating: 1 }).expect(409);
    await request(app).get(`/api/reviews/${"0".repeat(64)}`).expect(404);

    const page = (await request(app).get("/api/vans/toyota-proace-verso")).body;
    expect(page.reviews).toMatchObject({ count: 1, average: 4, items: [{ rating: 4, name: "Amra", comment: "Čist kombi, ljubazan vlasnik." }] });
    const card = (await request(app).get("/api/search")).body.items.find((v: { slug: string }) => v.slug === "toyota-proace-verso");
    expect(card.rating).toEqual({ average: 4, count: 1 });

    // An admin can hide it; owners can't.
    const [r] = (await admin.get("/api/admin/reviews").expect(200)).body as { id: string }[];
    await (await as(AMIR)).patch(`/api/admin/reviews/${r!.id}`).send({ hidden: true }).expect(403);
    await admin.patch(`/api/admin/reviews/${r!.id}`).send({ hidden: true }).expect(200);
    expect((await request(app).get("/api/vans/toyota-proace-verso")).body.reviews.count).toBe(0);
  });
});

describe("documents with a booking request", () => {
  const send = (body: Record<string, unknown>, files: [string, Buffer][] = []) => {
    let req = request(app).post("/api/bookings").field("data", JSON.stringify(body));
    for (const [kind, file] of files) req = req.attach(kind, file, `${kind}.jpg`);
    return req;
  };

  it("asks only for what the owner wants, keeps the photos encrypted and shows them only to the owner", async () => {
    const amir = await as(AMIR);
    const me = (await amir.get("/api/admin/me").expect(200)).body;
    expect(me.documents).toEqual({ id: "off", license: "off" });
    await amir.put("/api/admin/me").send({ name: me.name, phone: me.phone, documents: { id: "required", license: "optional" } }).expect(200);
    expect((await amir.get("/api/admin/me")).body.documents).toEqual({ id: "required", license: "optional" });

    const [mine] = (await amir.get("/api/admin/vans").expect(200)).body as { id: string; slug: string }[];
    expect((await request(app).get(`/api/vans/${mine!.slug}`)).body.documents).toEqual({ id: "required", license: "optional" });
    // Vans of owners who ask for nothing say nothing.
    expect((await request(app).get("/api/vans/toyota-proace-verso")).body.documents).toBeUndefined();

    const body = booking({ vanId: mine!.id, start: "2027-03-01", end: "2027-03-04", extras: [] });
    const missing = await request(app).post("/api/bookings").send(body).expect(400);
    expect(missing.body).toMatchObject({ error: "documents_required", fields: { doc_id: "Obavezno" } });
    // A file that isn't a photo fails the whole request; nothing is booked.
    await send(body, [["id", Buffer.from("%PDF-1.4 not a photo")]]).expect(400);
    const before = (await amir.get("/api/admin/bookings")).body.length;

    const pic = await photo();
    const ok = await send(body, [["id", pic], ["id", pic], ["license", pic]]).expect(201);
    const list = (await amir.get("/api/admin/bookings")).body as { id: string; ref: string; documents: { id: string; kind: string }[] }[];
    expect(list).toHaveLength(before + 1);
    const b = list.find((x) => x.ref === ok.body.ref)!;
    expect(b.documents.map((d) => d.kind)).toEqual(["id", "id", "license"]);

    // Stored encrypted: no JPEG in the bucket.
    const stored = [...storage.files.entries()].filter(([k]) => k.startsWith(`documents/${b.id}/`));
    expect(stored).toHaveLength(3);
    for (const [, blob] of stored) expect(blob.subarray(0, 2).toString("hex")).not.toBe("ffd8");

    const doc = await amir.get(`/api/admin/bookings/${b.id}/documents/${b.documents[0]!.id}`).expect(200);
    expect(doc.headers["content-type"]).toContain("image/jpeg");
    expect(doc.headers["cache-control"]).toBe("private, no-store");
    expect((doc.body as Buffer).subarray(0, 2).toString("hex")).toBe("ffd8");
    const meta = await sharp(doc.body as Buffer).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(2000);
    expect(meta.exif).toBeUndefined();
    // Another owner can't see them.
    await (await as(BELMA)).get(`/api/admin/bookings/${b.id}/documents/${b.documents[0]!.id}`).expect(404);

    // Declined: the photos go.
    await amir.patch(`/api/admin/bookings/${b.id}`).send({ status: "declined" }).expect(200);
    expect([...storage.files.keys()].some((k) => k.startsWith(`documents/${b.id}/`))).toBe(false);
    await amir.get(`/api/admin/bookings/${b.id}/documents/${b.documents[0]!.id}`).expect(404);

    // A van whose owner doesn't ask for documents takes none.
    await send(booking({ start: "2027-03-10", end: "2027-03-13", extras: [] }), [["id", pic]]).expect(400);
  });

  it("deletes the photos some time after the rental", async () => {
    const { purgeDocuments } = await import("../src/services/documents");
    const amir = await as(AMIR);
    const [mine] = (await amir.get("/api/admin/vans").expect(200)).body as { id: string }[];
    const ok = await send(booking({ vanId: mine!.id, start: "2027-04-01", end: "2027-04-03", extras: [] }), [["id", await photo()]]).expect(201);
    const b = ((await amir.get("/api/admin/bookings")).body as { id: string; ref: string }[]).find((x) => x.ref === ok.body.ref)!;
    await amir.patch(`/api/admin/bookings/${b.id}`).send({ status: "confirmed" }).expect(200);

    expect(await purgeDocuments(db.orm, storage, "2027-04-20")).toBe(0);
    expect(await purgeDocuments(db.orm, storage, "2027-05-10")).toBe(1);
    expect([...storage.files.keys()].some((k) => k.startsWith(`documents/${b.id}/`))).toBe(false);
    const after = ((await amir.get("/api/admin/bookings")).body as { id: string; documents: unknown[] }[]).find((x) => x.id === b.id)!;
    expect(after.documents).toEqual([]);
  });
});
