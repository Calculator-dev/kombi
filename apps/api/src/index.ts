import { loadConfig } from "./config";
import { createApp } from "./app";
import { createDb } from "./db";
import { todayIn } from "@kombi/shared";
import { purgeDocuments } from "./services/documents";
import { purgeHandover } from "./services/videos";
import { createNotifier } from "./services/notify";
import { createStorage } from "./services/storage";

const config = loadConfig();
const db = await createDb({
  url: config.DATABASE_URL,
  dataDir: config.PGLITE_DIR,
  ssl: { mode: config.DATABASE_SSL, ca: config.DATABASE_CA_CERT },
});
const storage = createStorage(config);
const app = createApp({ db, config, notifier: createNotifier(config), storage });

// Customers' documents are deleted once they are no longer needed: checked at start and every 6 hours.
async function purge() {
  try {
    const today = todayIn(config.BUSINESS_TZ, new Date());
    const n = await purgeDocuments(db.orm, storage, today);
    if (n) console.info(`[documents] deleted ${n} old document photo(s)`);
    const v = await purgeHandover(db.orm, storage, today);
    if (v) console.info(`[handover] deleted ${v} old handover video(s)`);
  } catch (e) {
    console.error("[documents] purge failed", e);
  }
}
void purge();
setInterval(purge, 6 * 60 * 60 * 1000).unref();

const server = app.listen(config.PORT, () => {
  console.info(`[api] kombi.ba API on http://localhost:${config.PORT} (${db.kind})`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  });
}
