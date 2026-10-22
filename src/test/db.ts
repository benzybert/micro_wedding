import { closeDb, db } from "@/db";
import { runMigrations } from "@/db/migrate";
import { sql } from "drizzle-orm";

/**
 * Boot a throwaway in-memory Postgres (PGlite) with the real migrations applied.
 * Call in `beforeAll`; call `resetDb()` in `beforeEach` if tests share state.
 */
export async function setupTestDb() {
  delete process.env.DATABASE_URL;
  process.env.PGLITE_DIR = "memory://";
  await runMigrations();
  return db;
}

export async function resetDb() {
  // Truncating the roots cascades to everything that hangs off them.
  await db.execute(sql`TRUNCATE TABLE "weddings", "user" RESTART IDENTITY CASCADE`);
}

export async function teardownTestDb() {
  await closeDb();
}
