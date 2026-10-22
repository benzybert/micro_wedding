import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { createRequire } from "node:module";
import path from "node:path";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

type Holder = { db?: Db; close?: () => Promise<void> };
const holder = globalThis as unknown as { __microWeddingDb?: Holder };

/**
 * One connection holder per process (survives Next.js hot reloads).
 *
 *  - DATABASE_URL set  → postgres-js (Supabase / Neon / Railway). `prepare: false`
 *    keeps it compatible with PgBouncer transaction pooling.
 *  - otherwise (dev, tests) → embedded PGlite. PGLITE_DIR overrides the data dir;
 *    "memory://" gives a throwaway database. Not allowed in production.
 */
function create(): Holder {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { prepare: false, max: process.env.NODE_ENV === "production" ? 3 : 5 });
    return { db: drizzlePg(client, { schema }), close: () => client.end() };
  }
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("DATABASE_URL is required in production");
  }
  // Loaded lazily (and hidden from the bundler) so production never ships the embedded database.
  const req = createRequire(path.join(process.cwd(), "noop.js"));
  const { PGlite } = req("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
  const { drizzle: drizzlePglite } = req("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
  const dir =
    process.env.NEXT_PHASE === "phase-production-build" ? "memory://" : (process.env.PGLITE_DIR ?? ".data/pglite");
  const client = new PGlite(dir);
  // PGlite and postgres-js drizzle instances expose the same query-builder surface.
  return { db: drizzlePglite(client, { schema }) as unknown as Db, close: () => client.close() };
}

export function getDb(): Db {
  const h = (holder.__microWeddingDb ??= create());
  return h.db as Db;
}

/** Lazy proxy so importing this module (e.g. during `next build`) never opens a connection. */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<PropertyKey, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export async function closeDb() {
  await holder.__microWeddingDb?.close?.();
  holder.__microWeddingDb = undefined;
}

export { schema };
