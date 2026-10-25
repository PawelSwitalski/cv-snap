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
        },
      },
      "./extension/vitest.config.ts",
    ],
    coverage: {
      provider: "v8",
      include: ["shared/src/**/*.ts", "native-host/src/**/*.ts"],
      exclude: ["**/*.test.ts", "shared/src/index.ts", "shared/src/provider.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
