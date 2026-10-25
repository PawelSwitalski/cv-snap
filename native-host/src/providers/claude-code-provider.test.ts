import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toClaudeJsonSchema, type ProgressStep, type PromptBuilders } from "@cv-snap/shared";
import { afterEach, describe, expect, it } from "vitest";
import type { RunProcessOptions, RunProcessResult } from "../lib/run-process.js";
import { ClaudeCodeProvider } from "./claude-code-provider.js";

const sharedFixture = (name: "profile" | "requirements" | "plan") =>
  JSON.parse(
    readFileSync(
      new URL(`../../../shared/test/fixtures/${name}.valid.json`, import.meta.url),
      "utf8",
    ),
  ) as Record<string, unknown>;

/** A Claude session that passes the lockdown check and answers with `output`. */
const transcript = (output: unknown) =>
  [
    { type: "system", subtype: "init", tools: ["StructuredOutput"], mcp_servers: [] },
    {
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "StructuredOutput", input: output }] },
    },
    {
      type: "result",
      subtype: "success",
      is_error: false,
      num_turns: 2,
      structured_output: output,
    },
  ]
    .map((event) => JSON.stringify(event))
    .join("\n");

const ok = (stdout: string): RunProcessResult => ({
  exitCode: 0,
  stdout,
  stderr: "",
  isTimedOut: false,
  isAborted: false,
  spawnErrorCode: null,
});

const prompts: PromptBuilders = {
  profile: (input) => ({ system: "profile rules", user: `CV:${input.cvText}` }),
  requirements: (input) => ({ system: "requirements rules", user: `AD:${input.adText}` }),
  tailor: (input) => ({ system: "tailor rules", user: `LANG:${input.outputLanguage}` }),
};

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function providerAnswering(output: unknown) {
  const workRoot = mkdtempSync(join(tmpdir(), "cvsnap-provider-"));
  dirs.push(workRoot);
  const calls: RunProcessOptions[] = [];
  const provider = new ClaudeCodeProvider({
    prompts,
    workRoot,
    claudeConfigDir: join(workRoot, "claude-config"),
    findClaude: () => ({ command: "claude.exe", prefixArgs: [], source: "winget" }),
    run: (options) => {
      calls.push(options);
      return Promise.resolve(ok(transcript(output)));
    },
  });
  return { provider, calls };
}

const options = (steps: ProgressStep[] = []) => ({
  model: "claude-sonnet-5-5" as const,
  signal: new AbortController().signal,
  onProgress: (step: ProgressStep) => steps.push(step),
});
const schemaArg = (call: RunProcessOptions | undefined) =>
  JSON.parse(call?.args[call.args.indexOf("--json-schema") + 1] ?? "null") as unknown;

describe("ClaudeCodeProvider", () => {
  it("creates a profile: progress, prompt on stdin, profile schema, validated result", async () => {
    const { provider, calls } = providerAnswering(sharedFixture("profile"));
    const steps: ProgressStep[] = [];

    const profile = await provider.createProfile({ cvText: "Jan Testowy" }, options(steps));

    expect(steps).toEqual(["creating-profile"]);
    expect(calls[0]?.stdin).toBe("CV:Jan Testowy");
    expect(calls[0]?.args).toContain("claude-sonnet-5-5");
    expect(schemaArg(calls[0])).toEqual(toClaudeJsonSchema("profile"));
    expect(profile.contact.fullName).toBe("Jan Testowy");
    expect(profile).not.toHaveProperty("schemaVersion");
  });

  it("parses requirements with the requirements schema", async () => {
    const { provider, calls } = providerAnswering(sharedFixture("requirements"));
    const steps: ProgressStep[] = [];

    const requirements = await provider.parseRequirements(
      { adText: "Senior Frontend", url: null },
      options(steps),
    );

    expect(steps).toEqual(["parsing-requirements"]);
    expect(schemaArg(calls[0])).toEqual(toClaudeJsonSchema("requirements"));
    expect(requirements.seniority).toBe("senior");
  });

  it("tailors with the plan schema", async () => {
    const { provider, calls } = providerAnswering(sharedFixture("plan"));
    const steps: ProgressStep[] = [];

    const plan = await provider.tailor(
      {
        profile: sharedFixture("profile") as never,
        requirements: sharedFixture("requirements") as never,
        outputLanguage: "pl",
        validatorFeedback: null,
      },
      options(steps),
    );

    expect(steps).toEqual(["tailoring"]);
    expect(calls[0]?.stdin).toBe("LANG:pl");
    expect(schemaArg(calls[0])).toEqual(toClaudeJsonSchema("plan"));
    expect(plan.items[0]?.profileId).toBe("exp_acme");
  });

  it("rejects output that breaks the schema as GENERATION_FAILED/INVALID_OUTPUT", async () => {
    const { provider } = providerAnswering({
      ...sharedFixture("requirements"),
      seniority: "rockstar",
    });

    await expect(
      provider.parseRequirements({ adText: "x", url: null }, options()),
    ).rejects.toMatchObject({
      code: "GENERATION_FAILED",
      reason: "INVALID_OUTPUT",
    });
  });

  it("rejects a profile with duplicate ids (checked after the CLI's schema validation)", async () => {
    const profile = sharedFixture("profile");
    const skills = profile.skills as { id: string }[];
    if (skills[0]) skills[0].id = "exp_acme";
    const { provider } = providerAnswering(profile);

    await expect(provider.createProfile({ cvText: "x" }, options())).rejects.toMatchObject({
      reason: "INVALID_OUTPUT",
    });
  });

  it("does not leak model output into the error message", async () => {
    const { provider } = providerAnswering({ title: "Jan Testowy secret", seniority: "x" });

    await expect(
      provider.parseRequirements({ adText: "x", url: null }, options()),
    ).rejects.toSatisfy((error: Error) => !error.message.includes("Jan Testowy"));
  });

  it("reports CLAUDE_NOT_FOUND when Claude Code is missing", async () => {
    const provider = new ClaudeCodeProvider({
      prompts,
      findClaude: () => null,
      run: () => Promise.reject(new Error("not called")),
    });

    await expect(provider.createProfile({ cvText: "x" }, options())).rejects.toMatchObject({
      code: "CLAUDE_NOT_FOUND",
    });
  });

  it("checks health through the same CLI lookup and process runner", async () => {
    const provider = new ClaudeCodeProvider({
      prompts,
      findClaude: () => ({ command: "claude.exe", prefixArgs: [], source: "winget" }),
      run: (call) =>
        Promise.resolve(
          ok(call.args.includes("--version") ? "2.1.302 (Claude Code)" : '{"loggedIn":true}'),
        ),
    });

    await expect(
      provider.checkHealth({ signal: new AbortController().signal }),
    ).resolves.toMatchObject({
      claudeFound: true,
      isAuthenticated: true,
      isVersionSupported: true,
    });
  });
});
