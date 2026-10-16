import { defineConfig } from "drizzle-kit";

// `npm run db:generate` compares src/db/schema.ts with the existing migrations
// and writes a new SQL migration into ./drizzle. The API applies them on start.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  ...(process.env.DATABASE_URL ? { dbCredentials: { url: process.env.DATABASE_URL } } : {}),
});
