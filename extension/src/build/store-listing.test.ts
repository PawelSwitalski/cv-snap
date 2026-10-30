// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import en from "../../public/_locales/en/messages.json";
import pl from "../../public/_locales/pl/messages.json";
import { buildManifest, RELEASE_MODE } from "./manifest";

/**
 * `store/listing.md` against the store build (bolt 016, story 005): the store shows the manifest's
 * description as the summary, and every permission needs a justification in the dashboard.
 */
const LISTING = readFileSync(
  fileURLToPath(new URL("../../../store/listing.md", import.meta.url)),
  "utf8",
);
/** Chrome Web Store limit for the summary (the manifest `description`). */
const MAX_SHORT_DESCRIPTION = 132;

/** Text under a `### heading`, up to the next heading. */
function section(text: string, heading: string): string {
  const start = text.indexOf(`### ${heading}\n`);
  if (start === -1) throw new Error(`missing section: ${heading}`);
  const body = text.slice(start + heading.length + 5);
  const end = body.search(/^#{2,3} /m);
  return (end === -1 ? body : body.slice(0, end)).trim();
}

const languagePart = (heading: string) => {
  const start = LISTING.indexOf(`## ${heading}\n`);
  const rest = LISTING.slice(start + 1);
  const end = rest.search(/^## /m);
  return end === -1 ? rest : rest.slice(0, end);
};

describe("store listing", () => {
  it.each([
    ["English", "Short description", en.extDescription.message],
    ["Polski", "Krótki opis", pl.extDescription.message],
  ])(
    "%s: the short description is the manifest description, ≤ 132 characters",
    (part, heading, description) => {
      const short = section(languagePart(part), heading);

      expect(short).toBe(description);
      expect(short.length).toBeLessThanOrEqual(MAX_SHORT_DESCRIPTION);
    },
  );

  it.each([
    ["English", ["Name", "Full description"]],
    ["Polski", ["Nazwa", "Pełny opis"]],
  ])("%s: has a name and a full description", (part, [name, full]) => {
    expect(section(languagePart(part), name ?? "")).toBe("cv-snap");
    expect(section(languagePart(part), full ?? "").length).toBeGreaterThan(300);
  });

  it("justifies exactly the permissions of the store build", () => {
    const manifest = buildManifest(RELEASE_MODE);
    const justified = [...LISTING.matchAll(/^\| `([^`]+)`(?: \(optional\))? *\| (.+?) *\|$/gm)].map(
      ([, permission = "", text = ""]) => ({ permission, text }),
    );

    expect(justified.map((entry) => entry.permission).sort()).toEqual(
      [...(manifest.permissions ?? []), ...(manifest.optional_host_permissions ?? [])].sort(),
    );
    for (const entry of justified) expect(entry.text.length, entry.permission).toBeGreaterThan(40);
  });

  it("has the single purpose, data-use answers, privacy link and five screenshots", () => {
    expect(LISTING).toContain("## Single purpose");
    expect(LISTING).toContain("I do not sell or transfer user data to third parties");
    expect(LISTING).toContain("https://pawelswitalski.github.io/cv-snap/privacy/");
    expect(LISTING).toContain("1280×800");
    expect(LISTING.slice(LISTING.indexOf("## Screenshots")).match(/^\d\. \*\*/gm)).toHaveLength(5);
  });
});
