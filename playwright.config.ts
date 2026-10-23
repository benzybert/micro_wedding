import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3210);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${port}`, locale: "he-IL", trace: "retain-on-failure" },
  // A throwaway in-memory database, so every run starts empty.
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { PGLITE_DIR: "memory://", DATABASE_URL: "" },
  },
});
