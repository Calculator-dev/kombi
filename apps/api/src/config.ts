import "dotenv/config";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().optional().transform((v) => v || undefined),
  /** off: plain connection (local Postgres). require: encrypted. verify: encrypted and certificate checked. */
  DATABASE_SSL: z.enum(["off", "require", "verify"]).default("off"),
  /** CA certificate (PEM) for DATABASE_SSL=verify, e.g. Supabase's. "\n" escapes are allowed. */
  DATABASE_CA_CERT: z.string().optional().transform((v) => (v ? v.replace(/\\n/g, "\n") : undefined)),
  PGLITE_DIR: z.string().default("./data/pglite"),
  JWT_SECRET: z.string().optional().transform((v) => v || undefined),
  ADMIN_PASSWORD_HASH: z.string().optional().transform((v) => v || undefined),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  OWNER_EMAIL: z.string().optional().transform((v) => v || undefined),
  SMTP_HOST: z.string().optional().transform((v) => v || undefined),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("kombi.ba <rezervacije@kombi.ba>"),
  BUSINESS_TZ: z.string().default("Europe/Sarajevo"),
  TRUST_PROXY: z.coerce.number().int().default(1),
});

export type Config = z.infer<typeof schema> & { JWT_SECRET: string };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.parse(env);
  if (parsed.NODE_ENV === "production") {
    const missing = (["JWT_SECRET", "ADMIN_PASSWORD_HASH", "DATABASE_URL"] as const).filter((k) => !parsed[k]);
    if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if (!parsed.ADMIN_PASSWORD_HASH && parsed.NODE_ENV !== "test") {
    console.warn("[config] ADMIN_PASSWORD_HASH is not set — admin login is disabled. Run: npm run hash-password -- \"password\"");
  }
  return {
    ...parsed,
    // In development a random secret is fine: sessions just reset on restart.
    JWT_SECRET: parsed.JWT_SECRET ?? randomBytes(32).toString("base64url"),
  };
}
