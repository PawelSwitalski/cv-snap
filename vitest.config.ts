import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "shared",
          root: "./shared",
          include: ["src/**/*.test.ts", "test/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "native-host",
          root: "./native-host",
          include: ["src/**/*.test.ts", "test/**/*.test.ts"],
          environment: "node",
          globalSetup: ["./test/global-setup.ts"],
          testTimeout: 20_000,
        },
      },
      "./extension/vitest.config.ts",
    ],
    coverage: {
      provider: "v8",
      include: ["shared/src/**/*.ts", "native-host/src/**/*.ts"],
      // Entry points only wire real stdio/argv; they are exercised by the end-to-end tests
      // (child processes, which in-process coverage can't see).
      exclude: [
        "**/*.test.ts",
        "shared/src/index.ts",
        "shared/src/provider.ts",
        "native-host/src/main.ts",
        "native-host/src/host-main.ts",
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
