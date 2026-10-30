import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { noticeFiles, ROOT } from "./third-party-notices.mjs";

/**
 * Release documents that must not drift from the code (bolt 016): license copies, third-party
 * notices, the privacy policy against the in-app notice, and the README against the UI texts.
 */
const read = (path) => readFileSync(join(ROOT, path), "utf8");
const messages = (lang) => JSON.parse(read(`extension/public/_locales/${lang}/messages.json`));
const message = (lang, key) => messages(lang)[key].message;

describe("license", () => {
  it("is MIT with the author and year, and the host package ships the same text", () => {
    const license = read("LICENSE");

    expect(license).toMatch(/^MIT License\n\nCopyright \(c\) 2026 Paweł Świtalski\n/);
    expect(read("native-host/LICENSE")).toBe(license);
  });

  it("is declared MIT in every package.json", () => {
    for (const path of ["package.json", "shared", "native-host", "extension"]) {
      const file = path.endsWith(".json") ? path : `${path}/package.json`;
      expect(JSON.parse(read(file)).license, file).toBe("MIT");
    }
  });
});

describe("third-party notices", () => {
  const files = noticeFiles();

  it("are up to date (run `pnpm notices` after changing dependencies)", () => {
    for (const file of files) {
      expect(readFileSync(file.path, "utf8"), file.path).toBe(file.content);
    }
  });

  it("list what each artefact ships", () => {
    const [host, extension] = files.map((file) => file.content);
    for (const name of ["zod", "pdfjs-dist"]) expect(host).toContain(`## ${name} `);
    const direct = Object.keys(JSON.parse(read("extension/package.json")).dependencies).filter(
      (name) => !name.startsWith("@cv-snap/"),
    );
    for (const name of direct) expect(extension, name).toContain(`## ${name} `);
  });

  it("carry a license text or field for every package", () => {
    for (const file of files) {
      for (const section of file.content.split("\n## ").slice(1)) {
        expect(section, section.split("\n")[0]).toMatch(/License: \S/);
      }
    }
  });

  it("ship with the extension next to the font license, and in the host package", () => {
    const host = JSON.parse(read("native-host/package.json"));

    expect(read("extension/public/fonts/OFL.txt")).toContain("SIL OPEN FONT LICENSE");
    expect(read("extension/public/THIRD-PARTY-NOTICES.md")).toContain("fonts/OFL.txt");
    expect(host.files).toContain("THIRD-PARTY-NOTICES.md");
  });
});

describe("privacy policy", () => {
  const noticeVersion = Number(
    /PRIVACY_NOTICE_VERSION = (\d+)/.exec(
      read("extension/src/features/onboarding/privacy-notice.ts"),
    )?.[1],
  );
  const POINTS = [
    "privacy_point_anthropic",
    "privacy_point_no_server",
    "privacy_point_local",
    "privacy_point_logs",
  ];

  it.each([
    ["en", "docs/privacy/index.md", "Version"],
    ["pl", "docs/privacy/pl.md", "Wersja"],
  ])("%s: has the in-app notice's version and a date", (_lang, path, word) => {
    const policy = read(path);

    expect(noticeVersion).toBeGreaterThan(0);
    expect(policy).toContain(`**${word} ${String(noticeVersion)}**`);
    expect(policy).toMatch(/\d{1,2} \S+ 20\d\d/);
  });

  it.each([
    ["en", "docs/privacy/index.md"],
    ["pl", "docs/privacy/pl.md"],
  ])("%s: quotes every point of the in-app notice word for word (NFR-2)", (lang, path) => {
    const policy = read(path);

    for (const key of POINTS) expect(policy, key).toContain(`- ${message(lang, key)}`);
  });

  it("names a contact and how to delete the data", () => {
    for (const path of ["docs/privacy/index.md", "docs/privacy/pl.md"]) {
      const policy = read(path);
      expect(policy, path).toContain("https://github.com/PawelSwitalski/cv-snap/issues");
      expect(policy, path).toContain("npx cv-snap-host uninstall --purge");
    }
  });
});

describe("README", () => {
  /** First cells of the troubleshooting table. */
  function troubleshootingRows(path) {
    const lines = read(path).split("\n");
    const start = lines.findIndex((line) =>
      /^\| (The side panel says|Panel boczny pokazuje)/.test(line),
    );
    const rows = [];
    for (const line of lines.slice(start + 2)) {
      if (!line.startsWith("|")) break;
      rows.push(line.split("|")[1].trim());
    }
    return rows;
  }
  const SETUP_CODES = [
    "HOST_NOT_INSTALLED",
    "HOST_DISCONNECTED",
    "CLAUDE_NOT_FOUND",
    "CLAUDE_NOT_AUTHENTICATED",
    "CLAUDE_VERSION_UNSUPPORTED",
    "HOST_VERSION_MISMATCH",
  ];

  it.each([
    ["en", "README.md"],
    ["pl", "README.pl.md"],
  ])("%s: quotes the side panel's error texts and covers every setup problem", (lang, path) => {
    const rows = troubleshootingRows(path);
    const errors = Object.entries(messages(lang)).filter(([key]) => key.startsWith("error_"));

    expect(rows.length).toBeGreaterThanOrEqual(SETUP_CODES.length);
    for (const row of rows) {
      expect(
        errors.some(([, value]) => value.message.startsWith(row)),
        `"${row}" is not an error text of the extension`,
      ).toBe(true);
    }
    for (const code of SETUP_CODES) {
      expect(rows, code).toContain(message(lang, `error_${code}`));
    }
  });

  it("is for users first: install command, doctor, privacy link; no early-development note", () => {
    const readme = read("README.md");

    expect(readme).not.toMatch(/early development/i);
    expect(readme).toContain("npx cv-snap-host install");
    expect(readme).toContain("npx cv-snap-host doctor");
    expect(readme).toContain("https://pawelswitalski.github.io/cv-snap/privacy/");
    expect(readme.indexOf("## Install")).toBeLessThan(readme.indexOf("## Development"));
    expect(readme).toContain("[Polski](README.pl.md)");
  });
});
