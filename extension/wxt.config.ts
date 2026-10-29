import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";
import { buildManifest } from "./src/build/manifest";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
    // The preview chunk loads react-pdf lazily. Pre-bundled at dev-server start, so discovering it
    // on the first result can't make Vite reload the side panel (which would lose the result).
    optimizeDeps: { include: ["@react-pdf/renderer"] },
  }),
  manifest: ({ mode }) => buildManifest(mode),
  // The store upload is `cv-snap-<version>-chrome-release.zip` (`pnpm zip:release`).
  zip: { artifactTemplate: "cv-snap-{{version}}-{{browser}}{{modeSuffix}}.zip" },
});
