import { defineProject } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

export default defineProject({
  // Root must be explicit: tests are started from the repo root via the workspace config.
  plugins: [WxtVitest({ root: import.meta.dirname })],
  test: {
    name: "extension",
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "happy-dom",
    setupFiles: ["./test/setup.ts"],
  },
});
