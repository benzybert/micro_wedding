/**
 * Apply SQL migrations from ./drizzle.
 *   npm run db:migrate                 → fails if DATABASE_URL is missing and PGlite is not wanted
 *   tsx scripts/migrate.ts --if-configured → no-op when DATABASE_URL is not set (used by `vercel-build`
 *                                           so preview builds without a database still succeed)
 */
import { closeDb } from "../src/db";
import { runMigrations } from "../src/db/migrate";

const ifConfigured = process.argv.includes("--if-configured");

async function main() {
  if (ifConfigured && !process.env.DATABASE_URL) {
    console.log("migrate: DATABASE_URL not set, skipping");
    return;
  }
  await runMigrations();
  console.log("migrate: done");
}

main()
  .then(() => closeDb())
  .catch(async (err) => {
    console.error(err);
    await closeDb().catch(() => {});
    process.exit(1);
  });
