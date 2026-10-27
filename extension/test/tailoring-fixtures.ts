import {
  CvSnapError,
  JobRequirementsSchema,
  type CvGenerationProvider,
  type CvProfileContent,
  type JobRequirements,
  type ProviderCallOptions,
  type TailoringPlan,
} from "@cv-snap/shared";
import requirementsJson from "../../shared/test/fixtures/requirements.valid.json";
import { smallProfile } from "./cv-fixtures";

/** Synthetic requirements (a fresh copy per call). */
export function smallRequirements(): JobRequirements {
  return JobRequirementsSchema.parse(structuredClone(requirementsJson));
}

export const invalidOutput = () =>
  new CvSnapError("GENERATION_FAILED", "Claude returned data that doesn't match the schema", {
    reason: "INVALID_OUTPUT",
  });

type Answer<T> = T | Error;

/**
 * Scriptable `CvGenerationProvider`: each step answers from its queue in order (an `Error` is
 * thrown), and every call is recorded. Never talks to a host.
 */
export function fakeProvider(script: {
  profile?: Answer<CvProfileContent>[];
  requirements?: Answer<JobRequirements>[];
  plan?: Answer<TailoringPlan>[];
}) {
  const calls = { createProfile: 0, parseRequirements: 0, tailor: 0 };
  const tailorInputs: Parameters<CvGenerationProvider["tailor"]>[0][] = [];
  const next = <T>(queue: Answer<T>[] | undefined, step: string): Promise<T> => {
    const answer = queue?.shift();
    if (answer === undefined) return Promise.reject(new Error(`unexpected ${step} call`));
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
  };
  const provider: CvGenerationProvider = {
    checkHealth: () => Promise.reject(new Error("not used")),
    createProfile: (_input, options: ProviderCallOptions) => {
      calls.createProfile++;
      options.onProgress?.("creating-profile");
      return next(script.profile, "createProfile");
    },
    parseRequirements: (_input, options: ProviderCallOptions) => {
      calls.parseRequirements++;
      options.onProgress?.("parsing-requirements");
      return next(script.requirements, "parseRequirements");
    },
    tailor: (input, options: ProviderCallOptions) => {
      calls.tailor++;
      tailorInputs.push(input);
      options.onProgress?.("tailoring");
      return next(script.plan, "tailor");
    },
  };
  return { provider, calls, tailorInputs };
}

export const callOptions = (signal = new AbortController().signal) => ({
  model: "claude-sonnet-5-5" as const,
  signal,
});

export { smallProfile };
