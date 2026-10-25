// RQ2: most reliable way to get schema-valid JSON from headless Claude Code.
import { runClaude, save, LOCKDOWN } from "./run-claude.mjs";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "seniority", "mustHave", "niceToHave", "language"],
  properties: {
    title: { type: "string" },
    seniority: { type: "string", enum: ["junior", "mid", "senior", "lead", "unknown"] },
    mustHave: { type: "array", items: { type: "string" } },
    niceToHave: { type: "array", items: { type: "string" } },
    language: { type: "string", enum: ["pl", "en", "de", "other"] },
  },
};

// Synthetic job ad (no real company/person data).
const JOB_AD = `Senior Frontend Developer (React) - Warszawa / zdalnie
Wymagania: min. 5 lat doswiadczenia z React i TypeScript, znajomosc testow (Jest/Vitest),
dobra znajomosc jezyka angielskiego (B2). Mile widziane: Next.js, GraphQL, doswiadczenie z CI/CD.`;

const TASK = `Extract the job requirements from the job ad below.\n\n<job_ad>\n${JOB_AD}\n</job_ad>`;
const PROMPT_ONLY = `${TASK}\n\nRespond with ONLY a JSON object (no prose, no markdown fences) matching this JSON Schema:\n${JSON.stringify(SCHEMA)}`;

// Schema the model can't honestly satisfy from this ad: forces a value that isn't in the text.
const IMPOSSIBLE_SCHEMA = {
  type: "object",
  required: ["salaryPln"],
  properties: { salaryPln: { type: "integer", minimum: 1 } },
  additionalProperties: false,
};

function validate(obj) {
  // Tiny hand-rolled check for this spike (zod/ajv arrive with the real code in bolt 002).
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return "not an object";
  for (const k of SCHEMA.required) if (!(k in obj)) return `missing ${k}`;
  for (const k of Object.keys(obj)) if (!(k in SCHEMA.properties)) return `extra key ${k}`;
  if (!SCHEMA.properties.seniority.enum.includes(obj.seniority)) return "bad seniority";
  if (!SCHEMA.properties.language.enum.includes(obj.language)) return "bad language";
  if (!Array.isArray(obj.mustHave) || !Array.isArray(obj.niceToHave)) return "arrays";
  return "ok";
}

function tryParse(text) {
  try {
    return { value: JSON.parse(text) };
  } catch (e) {
    return { parseError: String(e).slice(0, 120) };
  }
}

const CASES = {
  "b1-json-schema-flag-lockdown": {
    args: ["-p", "--model", "haiku", "--output-format", "json", "--json-schema",
      JSON.stringify(SCHEMA), ...LOCKDOWN],
    prompt: TASK,
  },
  "b2-prompt-only-json-lockdown": {
    args: ["-p", "--model", "haiku", "--output-format", "json", ...LOCKDOWN],
    prompt: PROMPT_ONLY,
  },
  "b3-json-schema-impossible": {
    args: ["-p", "--model", "haiku", "--output-format", "json", "--json-schema",
      JSON.stringify(IMPOSSIBLE_SCHEMA), ...LOCKDOWN],
    prompt: TASK,
  },
  "b4-json-schema-flag-sonnet": {
    args: ["-p", "--model", "sonnet", "--output-format", "json", "--json-schema",
      JSON.stringify(SCHEMA), ...LOCKDOWN],
    prompt: TASK,
  },
};

const REPEATS = Number(process.env.REPEATS ?? 1);
const summary = {};
for (const [name, c] of Object.entries(CASES)) {
  for (let i = 0; i < REPEATS; i++) {
    const run = await runClaude(c);
    const env = tryParse(run.stdout ?? "");
    const envelope = env.value ?? {};
    const fromResult = tryParse(String(envelope.result ?? ""));
    const structured = envelope.structured_output;
    const key = REPEATS > 1 ? `${name}#${i}` : name;
    summary[key] = {
      exitCode: run.exitCode,
      durationMs: run.durationMs,
      envelopeKeys: Object.keys(envelope),
      isError: envelope.is_error,
      subtype: envelope.subtype,
      numTurns: envelope.num_turns,
      hasStructuredOutput: structured !== undefined,
      structuredValid: structured !== undefined ? validate(structured) : null,
      resultParses: fromResult.value !== undefined,
      resultValid: fromResult.value !== undefined ? validate(fromResult.value) : fromResult.parseError,
      structured,
      resultText: String(envelope.result ?? "").slice(0, 400),
      stderr: run.stderr?.slice(0, 400),
    };
    save(key, { run, summary: summary[key] });
    console.log(key, JSON.stringify({ ...summary[key], structured: undefined, resultText: undefined }));
  }
}
save(REPEATS > 1 ? "b-summary-repeats" : "b-summary", summary);
