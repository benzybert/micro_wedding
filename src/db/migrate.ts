import path from "node:path";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import { getDb } from "./index";
import type * as schema from "./schema";

const migrationsFolder = path.join(process.cwd(), "drizzle");

/** Apply pending SQL migrations to whichever database `getDb()` points at. */
export async function runMigrations() {
  const db = getDb();
  if (process.env.DATABASE_URL) {
    await migratePg(db, { migrationsFolder });
    return;
  }
  // Same underlying PGlite instance; the pglite migrator only needs the drizzle wrapper.
  await migratePglite(db as unknown as PgliteDatabase<typeof schema>, { migrationsFolder });
}
