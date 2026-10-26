import "dotenv/config";
import { z } from "zod";

const optional = z.string().optional().transform((v) => v || undefined);

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: optional,
  /** off: plain connection (local Postgres). require: encrypted. verify: encrypted and certificate checked. */
  DATABASE_SSL: z.enum(["off", "require", "verify"]).default("off"),
  /** CA certificate (PEM) for DATABASE_SSL=verify, e.g. Supabase's. "\n" escapes are allowed. */
  DATABASE_CA_CERT: z.string().optional().transform((v) => (v ? v.replace(/\\n/g, "\n") : undefined)),
  PGLITE_DIR: z.string().default("./data/pglite"),
  /** Supabase project URL; logins are Supabase Auth tokens issued by it. */
  SUPABASE_URL: optional,
  /** Public keys that sign those tokens. Defaults to the project's standard JWKS address. */
  SUPABASE_JWKS_URL: optional,
  /** Comma-separated emails of platform admins: they see every van and approve owners. */
  PLATFORM_ADMIN_EMAILS: z
    .string()
    .default("")
    .transform((v) => v.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)),
  /** Backblaze B2 (S3-compatible) bucket for van photos. Without it, photos are kept in memory (development). */
  BACKBLAZE_ENDPOINT: optional,
  BACKBLAZE_REGION: optional,
  BACKBLAZE_KEY_ID: optional,
  BACKBLAZE_APP_KEY: optional,
  BACKBLAZE_BUCKET_NAME: optional,
  /** Public address of the bucket's files. Default: https://<bucket>.s3.<region>.backblazeb2.com */
  BACKBLAZE_PUBLIC_URL: optional,
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  /** Gets a copy of every booking request, for the platform. */
  OWNER_EMAIL: optional,
  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("kombi.ba <rezervacije@kombi.ba>"),
  BUSINESS_TZ: z.string().default("Europe/Sarajevo"),
  TRUST_PROXY: z.coerce.number().int().default(1),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.parse(env);
  if (parsed.NODE_ENV === "production") {
    const required = ["DATABASE_URL", "SUPABASE_URL", "BACKBLAZE_ENDPOINT", "BACKBLAZE_KEY_ID", "BACKBLAZE_APP_KEY", "BACKBLAZE_BUCKET_NAME"] as const;
    const missing = required.filter((k) => !parsed[k]);
    if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if (!parsed.SUPABASE_URL && parsed.NODE_ENV !== "test") {
    console.warn("[config] SUPABASE_URL is not set — nobody can log in to the admin panel.");
  }
  if (!parsed.PLATFORM_ADMIN_EMAILS.length && parsed.NODE_ENV !== "test") {
    console.warn("[config] PLATFORM_ADMIN_EMAILS is empty — nobody can approve new owners.");
  }
  return parsed;
}
