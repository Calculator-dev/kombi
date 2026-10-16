/** Runs pending migrations without starting the server: npm run db:migrate */
import { loadConfig } from "../config";
import { createDb } from "./index";

const config = loadConfig();
const db = await createDb({ url: config.DATABASE_URL, dataDir: config.PGLITE_DIR });
console.info(`[db] migrations up to date (${db.kind})`);
await db.close();
