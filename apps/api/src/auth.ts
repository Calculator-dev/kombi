import type { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Config } from "./config";
import { HttpError } from "./errors";

export const SESSION_COOKIE = "kombi_admin";
const SESSION_DAYS = 7;

export function createAuth(config: Config) {
  const key = new TextEncoder().encode(config.JWT_SECRET);

  async function checkPassword(password: string): Promise<boolean> {
    if (!config.ADMIN_PASSWORD_HASH) return false;
    return bcrypt.compare(password, config.ADMIN_PASSWORD_HASH);
  }

  async function issue(): Promise<string> {
    return new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${SESSION_DAYS}d`)
      .sign(key);
  }

  async function verify(token: string | undefined): Promise<boolean> {
    if (!token) return false;
    try {
      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
      return payload.role === "admin";
    } catch {
      return false;
    }
  }

  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400_000,
  };

  const requireAdmin: RequestHandler = async (req, _res, next) => {
    if (await verify(req.cookies?.[SESSION_COOKIE])) return next();
    next(new HttpError(401, "unauthorized", "Prijavite se ponovo."));
  };

  return { checkPassword, issue, verify, requireAdmin, cookieOptions };
}
export type Auth = ReturnType<typeof createAuth>;
