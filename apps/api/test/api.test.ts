import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app";
import { loadConfig } from "../src/config";
import { createDb, type Db } from "../src/db";
import type { Notifier } from "../src/services/notify";

// Runs on in-memory PGlite by default. Set TEST_DATABASE_URL to an EMPTY PostgreSQL
// database to run the same tests against real Postgres (CI does both).
const NOW = new Date("2026-10-16T10:00:00Z");
const PASSWORD = "test-password-123";

let db: Db;
let app: ReturnType<typeof createApp>;
const sent: string[] = [];

const booking = (over: Record<string, unknown> = {}) => ({
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

beforeAll(async () => {
  db = await createDb({ url: process.env.TEST_DATABASE_URL, dataDir: null });
  const config = loadConfig({
    NODE_ENV: "test",
    JWT_SECRET: "test-secret-test-secret-test-secret",
    ADMIN_PASSWORD_HASH: await bcrypt.hash(PASSWORD, 4),
  });
  const notifier: Notifier = {
    bookingRequested: async (b) => void sent.push(`requested:${b.ref}`),
    bookingConfirmed: async (b) => void sent.push(`confirmed:${b.ref}`),
  };
  app = createApp({ db, config, notifier, now: () => NOW });
});

afterAll(async () => {
  await db.close();
});

async function adminAgent() {
  const agent = request.agent(app);
  await agent.post("/api/admin/login").send({ password: PASSWORD }).expect(200);
  return agent;
}

describe("public API", () => {
  it("returns default settings", async () => {
    const res = await request(app).get("/api/settings").expect(200);
    expect(res.body.dailyRate).toBe(120);
  });

  it("quotes a rental", async () => {
    const res = await request(app)
      .post("/api/quote")
      .send({ start: "2026-10-21", end: "2026-10-24", extras: ["childSeat"], pickup: "airport" })
      .expect(200);
    expect(res.body.total).toBe(360 + 30 + 30);
  });

  it("creates a pending booking that holds its dates", async () => {
    const res = await request(app).post("/api/bookings").send(booking()).expect(201);
    expect(res.body.ref).toBe("KB-2026-0001");
    expect(res.body.total).toBe(410);
    expect(sent).toContain("requested:KB-2026-0001");

    const av = await request(app).get("/api/availability?from=2026-10-01&to=2026-10-31").expect(200);
    expect(av.body.unavailable).toEqual(["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"]);
    // No personal data in the public calendar
    expect(JSON.stringify(av.body)).not.toContain("Amra");
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

  it("rejects past dates", async () => {
    await request(app).post("/api/bookings").send(booking({ start: "2026-10-10", end: "2026-10-12" })).expect(400);
  });

  it("silently ignores spam (honeypot)", async () => {
    await request(app)
      .post("/api/bookings")
      .send(booking({ start: "2026-12-01", end: "2026-12-03", website: "x" }))
      .expect(201); // looks accepted to the bot, but nothing is stored
    const av = await request(app).get("/api/availability?from=2026-12-01&to=2026-12-05").expect(200);
    expect(av.body.unavailable).toEqual([]);
  });
});

describe("admin API", () => {
  it("requires login", async () => {
    await request(app).get("/api/admin/bookings").expect(401);
    await request(app).post("/api/admin/login").send({ password: "wrong" }).expect(401);
  });

  it("confirms a booking", async () => {
    const agent = await adminAgent();
    const list = await agent.get("/api/admin/bookings").expect(200);
    const first = list.body.find((x: { ref: string }) => x.ref === "KB-2026-0001");
    const res = await agent.patch(`/api/admin/bookings/${first.id}`).send({ status: "confirmed" }).expect(200);
    expect(res.body.status).toBe("confirmed");
    expect(sent).toContain("confirmed:KB-2026-0001");
  });

  it("frees dates when a booking is declined", async () => {
    const created = await request(app).post("/api/bookings").send(booking({ start: "2026-11-10", end: "2026-11-12" }));
    const agent = await adminAgent();
    const list = await agent.get("/api/admin/bookings?status=pending").expect(200);
    const b = list.body.find((x: { ref: string }) => x.ref === created.body.ref);
    await agent.patch(`/api/admin/bookings/${b.id}`).send({ status: "declined" }).expect(200);
    const av = await request(app).get("/api/availability?from=2026-11-01&to=2026-11-30").expect(200);
    expect(av.body.unavailable).toEqual([]);
  });

  it("blocks dates and updates settings", async () => {
    const agent = await adminAgent();
    const block = await agent.post("/api/admin/blocks").send({ start: "2026-11-20", end: "2026-11-21", reason: "Servis" }).expect(201);
    const av = await request(app).get("/api/availability?from=2026-11-01&to=2026-11-30").expect(200);
    expect(av.body.unavailable).toEqual(["2026-11-20", "2026-11-21"]);
    await request(app).post("/api/bookings").send(booking({ start: "2026-11-21", end: "2026-11-23" })).expect(409);
    await agent.delete(`/api/admin/blocks/${block.body.id}`).expect(204);

    const settings = (await agent.get("/api/admin/settings").expect(200)).body;
    await agent.put("/api/admin/settings").send({ ...settings, dailyRate: 140 }).expect(200);
    expect((await request(app).get("/api/settings")).body.dailyRate).toBe(140);
    await agent.put("/api/admin/settings").send({ ...settings, dailyRate: -5 }).expect(400);
  });
});
