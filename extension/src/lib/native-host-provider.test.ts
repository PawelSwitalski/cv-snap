import type { ProgressStep } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { smallPlan, smallProfile } from "../../test/cv-fixtures";
import { smallRequirements } from "../../test/tailoring-fixtures";
import { createNativeHostClient, type NativePort } from "./native-host-client";
import { NativeHostProvider } from "./native-host-provider";

/** Fake Chrome port whose "host" answers each request with `answer(request)`. */
function providerOverFakePort(answer: (request: Record<string, unknown>) => unknown) {
  const posted: Record<string, unknown>[] = [];
  let deliver: (message: unknown) => void = () => undefined;
  const port: NativePort = {
    postMessage: (message) => {
      const request = message as Record<string, unknown>;
      posted.push(request);
      if (request.type === "cancel") return;
      queueMicrotask(() => {
        deliver({ type: "progress", requestId: request.requestId, step: "tailoring" });
        deliver({
          type: "response",
          requestId: request.requestId,
          response: { ok: true, data: answer(request) },
        });
      });
    },
    disconnect: () => undefined,
    onMessage: {
      addListener: (callback) => {
        deliver = callback;
      },
    },
    onDisconnect: { addListener: () => undefined },
  };
  let id = 0;
  const client = createNativeHostClient({
    connect: () => port,
    lastErrorMessage: () => undefined,
    newRequestId: () => `r${String(++id)}`,
  });
  return { provider: new NativeHostProvider(client), posted };
}

const options = (steps: ProgressStep[] = []) => ({
  model: "claude-haiku-5-5" as const,
  signal: new AbortController().signal,
  onProgress: (step: ProgressStep) => steps.push(step),
});

describe("NativeHostProvider", () => {
  it("sends createProfile with the model and returns the validated profile", async () => {
    const { provider, posted } = providerOverFakePort(() => smallProfile());
    const steps: ProgressStep[] = [];

    const profile = await provider.createProfile({ cvText: "CV" }, options(steps));

    expect(posted[0]).toEqual({
      type: "createProfile",
      model: "claude-haiku-5-5",
      cvText: "CV",
      requestId: "r1",
    });
    expect(profile.contact.fullName).toBe("Jan Testowy");
    expect(steps).toEqual(["tailoring"]);
  });

  it("sends parseRequirements with structured fields (null when absent)", async () => {
    const { provider, posted } = providerOverFakePort(() => smallRequirements());

    await provider.parseRequirements({ adText: "ad", url: null }, options());
    await provider.parseRequirements(
      {
        adText: "ad",
        url: "https://x.test",
        structuredFields: { title: "T", company: null, description: null },
      },
      options(),
    );

    expect(posted[0]).toMatchObject({
      type: "parseRequirements",
      structuredFields: null,
      url: null,
    });
    expect(posted[1]).toMatchObject({ structuredFields: { title: "T" } });
  });

  it("sends tailor with profile, requirements, output language and feedback", async () => {
    const { provider, posted } = providerOverFakePort(() => smallPlan());
    const input = {
      profile: smallProfile(),
      requirements: smallRequirements(),
      outputLanguage: "pl",
      validatorFeedback: ["x"],
    };

    const plan = await provider.tailor(input, options());

    expect(posted[0]).toMatchObject({
      type: "tailor",
      outputLanguage: "pl",
      validatorFeedback: ["x"],
    });
    expect(plan.items[0]?.profileId).toBe("exp_acme");
  });

  it("rejects a reply that doesn't match the schema", async () => {
    const { provider } = providerOverFakePort(() => ({ title: 42 }));

    await expect(
      provider.parseRequirements({ adText: "ad", url: null }, options()),
    ).rejects.toMatchObject({
      code: "INVALID_MESSAGE",
    });
  });

  it("passes health requests through", async () => {
    const health = {
      hostVersion: "0.1.0",
      claudeFound: true,
      claudeVersion: "2.1.302",
      isAuthenticated: true,
      isVersionSupported: true,
    };
    const { provider } = providerOverFakePort(() => health);

    await expect(provider.checkHealth({ signal: new AbortController().signal })).resolves.toEqual(
      health,
    );
  });
});
