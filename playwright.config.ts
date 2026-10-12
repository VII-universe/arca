import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import path from "path";

// Loaded here (before Playwright spawns worker subprocesses, which inherit
// process.env) rather than per-test-file — Next.js's own convention is
// .env.local, not plain dotenv's default .env.
config({ path: path.resolve(__dirname, ".env.local") });

const PORT = 3411;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // tests share a real (throwaway-account) DB — keep sequential
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The app's default/fallback locale is Czech (see i18n/config.ts) and
    // tests assert on Czech copy — without this, Chromium's default
    // Accept-Language (en-US) makes the app render English and every
    // Czech-text locator times out.
    locale: "cs-CZ",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
