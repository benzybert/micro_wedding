import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // PGlite boots a WASM Postgres; give DB tests room.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
