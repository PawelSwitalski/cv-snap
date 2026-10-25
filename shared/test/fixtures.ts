import { readFileSync } from "node:fs";

/** Loads a JSON fixture as a fresh, mutable copy (tests may break it on purpose). */
export function loadFixture(name: "profile" | "requirements" | "plan"): Record<string, unknown> {
  const url = new URL(`./fixtures/${name}.valid.json`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as Record<string, unknown>;
}
