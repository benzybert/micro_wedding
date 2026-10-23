/**
 * Runs once when the server boots.
 *
 *  - AUTO_MIGRATE=1 (Railway or any long-running host): apply pending SQL migrations to DATABASE_URL before
 *    serving. Needs no dev tooling at runtime. Vercel instead migrates during the build (`vercel-build`).
 *  - Local development without DATABASE_URL: create and migrate the embedded PGlite database.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (process.env.AUTO_MIGRATE === "1") {
    if (!process.env.DATABASE_URL) throw new Error("AUTO_MIGRATE=1 requires DATABASE_URL");
    const { runMigrations } = await import("@/db/migrate");
    await runMigrations();
    return;
  }

  if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL) return;
  const { runMigrations } = await import("@/db/migrate");
  await runMigrations();
}
