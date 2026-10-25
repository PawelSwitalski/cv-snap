import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** End-to-end tests run the built host, so build `shared` and `native-host` first (~3 s). */
export default function setup(): void {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const tsc = fileURLToPath(new URL("../../node_modules/typescript/bin/tsc", import.meta.url));
  for (const project of ["shared/tsconfig.build.json", "native-host/tsconfig.build.json"]) {
    execFileSync(process.execPath, [tsc, "-p", project], { cwd: root, stdio: "inherit" });
  }
}
