import { loadConfig } from "./config";
import { createApp } from "./app";
import { createDb } from "./db";
import { createNotifier } from "./services/notify";

const config = loadConfig();
const db = await createDb({ url: config.DATABASE_URL, dataDir: config.PGLITE_DIR });
const app = createApp({ db, config, notifier: createNotifier(config) });

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
