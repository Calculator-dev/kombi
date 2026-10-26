import type { RequestHandler, Response } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { Config } from "./config";
import type { Db } from "./db";
import type { UserRow } from "./db/schema";
import { HttpError } from "./errors";
import { ensureUser } from "./services/users";

/**
 * Logins are handled by Supabase Auth (sign-up, email confirmation, password
 * reset). The browser sends its Supabase access token; we check its signature
 * against the project's public keys and look up (or create) our own user row.
 */
export function createAuth(config: Config, db: Db, keys?: JWTVerifyGetKey) {
  const issuer = config.SUPABASE_URL ? `${config.SUPABASE_URL.replace(/\/$/, "")}/auth/v1` : undefined;
  const jwks =
    keys ??
    (issuer ? createRemoteJWKSet(new URL(config.SUPABASE_JWKS_URL ?? `${issuer}/.well-known/jwks.json`)) : undefined);

  async function verify(token: string): Promise<{ id: string; email: string } | null> {
    if (!jwks) return null;
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience: "authenticated" });
      if (typeof payload.sub !== "string" || typeof payload.email !== "string" || !payload.email) return null;
      return { id: payload.sub, email: payload.email };
    } catch {
      return null;
    }
  }

  const requireUser: RequestHandler = async (req, res, next) => {
    try {
      const token = req.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
      const claims = token ? await verify(token) : null;
      if (!claims) throw new HttpError(401, "unauthorized", "Prijavite se ponovo.");
      const user = await ensureUser(db.orm, claims, config.PLATFORM_ADMIN_EMAILS);
      if (user.status === "suspended") throw new HttpError(403, "suspended", "Vaš račun je suspendovan. Kontaktirajte nas.");
      res.locals.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };

  const requireAdmin: RequestHandler = (_req, res, next) => {
    next(currentUser(res).role === "admin" ? undefined : new HttpError(403, "forbidden", "Samo za administratore."));
  };

  return { verify, requireUser, requireAdmin };
}
export type Auth = ReturnType<typeof createAuth>;

/** The logged-in user; only valid after `requireUser`. */
export function currentUser(res: Response): UserRow {
  return res.locals.user as UserRow;
}
