import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** End-to-end tests run the bundled host, so build `shared`, then bundle the host (~3 s). */
export default function setup(): void {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const tsc = fileURLToPath(new URL("../../node_modules/typescript/bin/tsc", import.meta.url));
  execFileSync(process.execPath, [tsc, "-p", "shared/tsconfig.build.json"], {
    cwd: root,
    stdio: "inherit",
  });
  execFileSync(process.execPath, ["native-host/scripts/bundle.mjs"], {
    cwd: root,
    stdio: "inherit",
  });
}
