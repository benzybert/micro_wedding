/**
 * Runs once when the server boots. In local development (no DATABASE_URL) the embedded PGlite
 * database is created on first run, so migrate it here. Production databases are migrated by
 * `npm run db:migrate` (wired into `vercel-build`), never at request time.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL) return;
  const { runMigrations } = await import("@/db/migrate");
  await runMigrations();
}
