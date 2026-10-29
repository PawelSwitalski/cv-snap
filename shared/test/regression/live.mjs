// Regression suite, live mode (story 008, ddd-02 decision 6): runs each fixture case through the
// BUILT native host (the extension's real path) with the user's Claude Code and writes recordings
// with `reviewedAt: null`. Opt-in, costs Claude usage. Recorded mode ignores recordings and CV
// profiles until they are reviewed (`--review`), so nothing is accepted automatically.
//
//   pnpm test:live [--set real] [--model claude-sonnet-5-5] [--case <id>] [--resume]
//   pnpm regression:review --set real <caseId | cv:<cvId> | all>
//
// Untrusted ad HTML is reduced to text here without the extension's hidden-text filter, which
// makes the injection cases stricter than in the extension. Output: counts and timings only.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decideOutputLanguage, toFeedback, validatePlan } from "../../dist/index.js";
// Dependency-free TypeScript module: Node 26 runs it directly (type stripping).
import { buildInjectionVariants } from "./build-injections.ts";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const setName = flag("set", "real");
const model = flag("model", "claude-sonnet-5-5");
const onlyCase = flag("case", null);
// `--review` is a switch; its target is the positional argument (`pnpm regression:review --set real
// cv:<id>` expands to `live.mjs --review --set real cv:<id>`, so "the value after --review" is wrong).
const VALUE_FLAGS = new Set(["--set", "--model", "--case"]);
// `--resume`: skip cases already recorded with this model, so an interrupted run (e.g. a usage
// limit) continues where it stopped instead of paying for finished cases again.
const isResume = args.includes("--resume");
const positional = args.filter(
  (arg, index) => !arg.startsWith("--") && !VALUE_FLAGS.has(args[index - 1] ?? ""),
);
const review = args.includes("--review") ? (positional[0] ?? null) : null;
if (args.includes("--review") && !review) {
  process.stderr.write("Usage: pnpm regression:review --set <set> <caseId | cv:<cvId> | all>\n");
  process.exit(1);
}
const setDir = new URL(`../fixtures/regression/${setName}/`, import.meta.url);
const print = (line) => process.stdout.write(`${line}\n`);

if (!existsSync(new URL("manifest.json", setDir))) {
  print(`No manifest at shared/test/fixtures/regression/${setName}/manifest.json`);
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(new URL("manifest.json", setDir), "utf8"));
const readJson = (path) => JSON.parse(readFileSync(new URL(path, setDir), "utf8"));
const writeJson = (path, value) => {
  // A fresh set has no recordings/ (or cvs/) folder yet.
  mkdirSync(new URL(".", new URL(path, setDir)), { recursive: true });
  writeFileSync(new URL(path, setDir), `${JSON.stringify(value, null, 2)}\n`);
};

if (review) {
  const now = new Date().toISOString();
  const targets =
    review === "all"
      ? [
          ...manifest.cvs.map((cv) => `cvs/${cv.id}.profile.json`),
          ...manifest.cases.map((testCase) => `recordings/${testCase.id}.json`),
        ]
      : [
          review.startsWith("cv:")
            ? `cvs/${review.slice(3)}.profile.json`
            : `recordings/${review}.json`,
        ];
  let reviewed = 0;
  for (const path of targets) {
    if (!existsSync(new URL(path, setDir))) continue;
    writeJson(path, { ...readJson(path), reviewedAt: now });
    print(`reviewed ${path}`);
    reviewed++;
  }
  if (reviewed === 0) {
    process.stderr.write(`Nothing to review for "${review}" in set "${setName}".\n`);
    process.exit(1);
  }
  process.exit(0);
}

// --- Native host client (length-prefixed JSON over stdio) ---
const hostPath = fileURLToPath(new URL("../../../native-host/dist/main.js", import.meta.url));
const host = spawn(process.execPath, [hostPath], { stdio: ["pipe", "pipe", "ignore"] });
const pending = new Map();
let buffer = Buffer.alloc(0);
host.stdout.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (buffer.length >= 4) {
    const length = buffer.readUInt32LE(0);
    if (buffer.length < 4 + length) break;
    const frame = JSON.parse(buffer.subarray(4, 4 + length).toString("utf8"));
    buffer = buffer.subarray(4 + length);
    if (frame.type !== "response") continue;
    pending.get(frame.requestId)?.(frame.response);
    pending.delete(frame.requestId);
  }
});
let nextId = 0;
const call = (payload) =>
  new Promise((resolve, reject) => {
    const requestId = `live-${String(++nextId)}`;
    pending.set(requestId, (response) => {
      if (response.ok) resolve(response.data);
      else
        reject(
          new Error(
            `${response.error.code}${response.error.reason ? `/${response.error.reason}` : ""}`,
          ),
        );
    });
    const json = Buffer.from(JSON.stringify({ ...payload, requestId }), "utf8");
    const header = Buffer.alloc(4);
    header.writeUInt32LE(json.length, 0);
    host.stdin.write(Buffer.concat([header, json]));
  });
const timed = async (work) => {
  const started = Date.now();
  const value = await work();
  return { value, ms: Date.now() - started };
};

const htmlToText = (html) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, " $1 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

try {
  const health = await call({ type: "health" });
  if (!health.claudeFound || !health.isAuthenticated)
    throw new Error("Claude Code is not ready (run the health check)");
  print(`Live run: set "${setName}", model ${model}, Claude Code ${String(health.claudeVersion)}`);

  const profiles = new Map();
  for (const cv of manifest.cvs) {
    const path = `cvs/${cv.id}.profile.json`;
    if (existsSync(new URL(path, setDir))) {
      const recorded = readJson(path);
      if (recorded.reviewedAt) profiles.set(cv.id, recorded.profile);
      else
        print(
          `  ${cv.id}: profile recorded but not reviewed yet (review it, then: pnpm regression:review --set ${setName} cv:${cv.id})`,
        );
      continue;
    }
    const text = readFileSync(new URL(cv.file, setDir), "utf8");
    const { value: content, ms } = await timed(() =>
      call({ type: "createProfile", model, cvText: text }),
    );
    const now = new Date().toISOString();
    writeJson(path, {
      reviewedAt: null,
      model,
      durationMs: ms,
      profile: {
        ...content,
        schemaVersion: 1,
        id: `fixture-${cv.id}`,
        photoRef: null,
        confirmedAt: now,
        updatedAt: now,
      },
    });
    print(
      `  ${cv.id}: profile recorded in ${String(ms)} ms; review cvs/${cv.id}.profile.json before its cases run`,
    );
  }

  for (const testCase of manifest.cases) {
    if (onlyCase && testCase.id !== onlyCase) continue;
    const profile = profiles.get(testCase.cv);
    if (!profile) continue;
    const recordingPath = `recordings/${testCase.id}.json`;
    if (isResume && existsSync(new URL(recordingPath, setDir))) {
      if (readJson(recordingPath).model === model) {
        print(`  ${testCase.id}: already recorded with ${model}, skipped (--resume)`);
        continue;
      }
    }
    const ad = manifest.ads.find((entry) => entry.id === testCase.ad);
    const injectionPath = `injection/${testCase.id}.html`;
    if (testCase.kind === "injection" && !existsSync(new URL(injectionPath, setDir))) {
      // All variants on one page, committed with the set so it can be reviewed.
      let html = readFileSync(new URL(ad.file, setDir), "utf8");
      const kinds = buildInjectionVariants(html, testCase.marker).length;
      for (let index = 0; index < kinds; index++) {
        html = buildInjectionVariants(html, testCase.marker)[index].html;
      }
      mkdirSync(new URL("injection/", setDir), { recursive: true });
      writeFileSync(new URL(injectionPath, setDir), html);
    }
    const raw = readFileSync(
      new URL(testCase.kind === "injection" ? injectionPath : ad.file, setDir),
      "utf8",
    );
    const adText =
      /\.html?$/i.test(ad.file) || testCase.kind === "injection" ? htmlToText(raw) : raw;
    const started = Date.now();
    const { value: requirements, ms: requirementsMs } = await timed(() =>
      call({ type: "parseRequirements", model, adText, url: ad.url, structuredFields: null }),
    );
    const outputLanguage = decideOutputLanguage(requirements, null, profile.sourceLanguage).code;
    const tailor = (validatorFeedback) =>
      timed(() =>
        call({ type: "tailor", model, profile, requirements, outputLanguage, validatorFeedback }),
      );
    const first = await tailor(null);
    const plans = [first.value];
    let tailoringMs = first.ms;
    const firstRun = validatePlan(first.value, profile);
    if (firstRun.violationCount > 0) {
      const second = await tailor(toFeedback(firstRun));
      plans.push(second.value);
      tailoringMs += second.ms;
    }
    writeJson(`recordings/${testCase.id}.json`, {
      caseId: testCase.id,
      model,
      claudeCodeVersion: String(health.claudeVersion),
      recordedAt: new Date().toISOString(),
      reviewedAt: null,
      requirements,
      plans,
      durationsMs: {
        profile: null,
        requirements: requirementsMs,
        tailoring: tailoringMs,
        total: Date.now() - started,
      },
    });
    const run = validatePlan(plans.at(-1), profile);
    print(
      `  ${testCase.id}: attempts ${String(plans.length)}, unverified ${String(run.summary.unverified)}, ${String(Date.now() - started)} ms → review recordings/${testCase.id}.json`,
    );
  }
} finally {
  host.stdin.end();
}
