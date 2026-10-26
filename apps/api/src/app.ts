import express from "express";
import helmet from "helmet";
import type { JWTVerifyGetKey } from "jose";
import type { Config } from "./config";
import type { Db } from "./db";
import { createAuth, type Auth } from "./auth";
import { errorHandler } from "./errors";
import { adminRoutes } from "./routes/admin";
import { publicRoutes } from "./routes/public";
import type { Notifier } from "./services/notify";
import { createStorage, type PhotoStorage } from "./services/storage";

export interface Deps {
  db: Db;
  config: Config;
  notifier: Notifier;
  storage: PhotoStorage;
  auth: Auth;
  now: () => Date;
}

export function createApp(
  input: Omit<Deps, "auth" | "now" | "storage"> & { now?: () => Date; storage?: PhotoStorage; authKeys?: JWTVerifyGetKey },
) {
  const deps: Deps = {
    ...input,
    storage: input.storage ?? createStorage(input.config),
    auth: createAuth(input.config, input.db, input.authKeys),
    now: input.now ?? (() => new Date()),
  };
  const app = express();
  app.set("trust proxy", deps.config.TRUST_PROXY);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "50kb" }));

  const files = "files" in deps.storage ? (deps.storage.files as Map<string, Buffer>) : null;
  if (files) {
    // Development without Backblaze: serve the in-memory photos.
    app.get("/api/dev-photos/*key", (req, res) => {
      const key = ([] as string[]).concat(req.params.key as string | string[]).join("/");
      const file = files.get(key);
      if (!file) return void res.status(404).end();
      res.type("image/webp").send(file);
    });
  }

  app.use("/api", publicRoutes(deps));
  app.use("/api/admin", adminRoutes(deps));
  app.use((_req, res) => {
    res.status(404).json({ error: "not_found", message: "Ne postoji." });
  });
  app.use(errorHandler);
  return app;
}
