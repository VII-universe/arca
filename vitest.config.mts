import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Next.js auto-loads .env.local but vitest doesn't — load it explicitly so
// tests that need real provisioned vars (e.g. Upstash KV creds) see them.
loadEnv({ path: path.resolve(dirname, ".env.local") });

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "e2e"],
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "."),
    },
  },
});
