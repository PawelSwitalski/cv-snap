import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests (bolt 022): the e2e build of the extension in Chromium, the real host with the
 * fake AI provider. `pnpm test:e2e` builds everything first. One worker: each test starts its own
 * browser, and on Windows the host registration is per user.
 */
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { trace: "retain-on-failure", locale: "en-US" },
});
