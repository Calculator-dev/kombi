import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import type { Config } from "./config";
import type { Db } from "./db";
import { createAuth, type Auth } from "./auth";
import { errorHandler } from "./errors";
import { adminRoutes } from "./routes/admin";
import { publicRoutes } from "./routes/public";
import type { Notifier } from "./services/notify";

export interface Deps {
  db: Db;
  config: Config;
  notifier: Notifier;
  auth: Auth;
  now: () => Date;
}

export function createApp(input: Omit<Deps, "auth" | "now"> & { now?: () => Date }) {
  const deps: Deps = { ...input, auth: createAuth(input.config), now: input.now ?? (() => new Date()) };
  const app = express();
  app.set("trust proxy", deps.config.TRUST_PROXY);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "50kb" }));
  app.use(cookieParser());

  app.use("/api", publicRoutes(deps));
  app.use("/api/admin", adminRoutes(deps));
  app.use((_req, res) => {
    res.status(404).json({ error: "not_found", message: "Ne postoji." });
  });
  app.use(errorHandler);
  return app;
}
