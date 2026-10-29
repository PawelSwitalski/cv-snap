import { validatePlan, type TailoringPlan } from "@cv-snap/shared";
import type { CvModel } from "@/features/cv-pdf/cv-model";
import type { GenerationResult } from "@/features/generation/generation-result";
import type { GenerateMessage, GenerationEvent } from "@/features/generation/messages";
import type { ClientPort } from "@/features/generate/generation-client";
import type { PageFacts, PageStateApis } from "@/features/generate/page-state";
import type { FittedCv } from "@/features/generate/use-fitted-cv";
import { smallPlan, smallProfile } from "./cv-fixtures";
import { smallRequirements } from "./tailoring-fixtures";

/** The small plan with its first bullet inventing a number (12 apps) the profile doesn't have. */
export function fabricatedPlan(): TailoringPlan {
  const plan = smallPlan();
  const bullet = plan.items[0]?.bullets[0];
  if (bullet) bullet.text = "Migracja 12 aplikacji do TypeScript.";
  return plan;
}

/** A finished generation for the small synthetic profile (verdicts from the real validator). */
export function generationResult(plan: TailoringPlan = smallPlan()): GenerationResult {
  return {
    plan,
    validation: validatePlan(plan, smallProfile()),
    gaps: plan.gaps,
    requirements: { ...smallRequirements(), company: "Acme Test" },
    outputLanguage: { code: "pl", source: "ad" },
    fromCache: false,
    attempts: 1,
    chosenAttempt: 1,
    durationsMs: { requirements: 0, tailoring: 0, validation: 0, total: 0 },
  };
}

/** Side panel end of a generation port: records posts, lets the test play the background. */
export function fakeClientPort() {
  const messageListeners: ((message: unknown) => void)[] = [];
  const disconnectListeners: (() => void)[] = [];
  const posted: GenerateMessage[] = [];
  const state = { isDisconnected: false };
  const port: ClientPort = {
    postMessage: (message) => {
      posted.push(message);
    },
    onMessage: { addListener: (callback) => messageListeners.push(callback) },
    onDisconnect: { addListener: (callback) => disconnectListeners.push(callback) },
    disconnect: () => {
      state.isDisconnected = true;
    },
  };
  return {
    port,
    posted,
    state,
    emit(event: GenerationEvent | Record<string, unknown>) {
      for (const listener of messageListeners) listener(event);
    },
    /** The background end went away (worker stopped) without answering. */
    drop() {
      for (const listener of disconnectListeners) listener();
    },
  };
}

export type FakeClientPort = ReturnType<typeof fakeClientPort>;

/** `ConnectGeneration` that opens a new fake port per run. */
export function fakeConnector() {
  const ports: FakeClientPort[] = [];
  return {
    ports,
    connect: () => {
      const created = fakeClientPort();
      ports.push(created);
      return created.port;
    },
    last(): FakeClientPort {
      const port = ports.at(-1);
      if (!port) throw new Error("no port opened");
      return port;
    },
  };
}

/** Page-state APIs over mutable facts; `fire()` plays a browser event. */
export function fakePageStateApis(initial: PageFacts) {
  const facts = { ...initial };
  const listeners = new Set<() => void>();
  const apis: PageStateApis = {
    activeTab: () => Promise.resolve(facts.tab),
    grantedPatterns: () => Promise.resolve([...facts.grantedPatterns]),
    jobAdStatus: () => Promise.resolve(facts.jobAdStatus),
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
  return {
    apis,
    facts,
    listenerCount: () => listeners.size,
    fire() {
      for (const listener of listeners) listener();
    },
  };
}

export const AD_URL = "https://jobs.example.com/offer/1";
export const AD_PATTERN = "https://jobs.example.com/*";

/** Facts of an allowed tab showing a detected ad. */
export function adPageFacts(): PageFacts {
  return {
    tab: { id: 7, url: AD_URL },
    grantedPatterns: [AD_PATTERN],
    jobAdStatus: { isJobAd: true, url: AD_URL },
  };
}

/** Render stand-in: "fits" by returning the model, optionally with content dropped. */
export function fakeRender(options: { drop?: (model: CvModel) => FittedCv["dropped"] } = {}) {
  const rendered: CvModel[] = [];
  const pdfs: Blob[] = [];
  return {
    rendered,
    pdfs,
    render: (model: CvModel): Promise<FittedCv> => {
      rendered.push(model);
      const pdf = new Blob([`pdf ${String(rendered.length)}`], { type: "application/pdf" });
      pdfs.push(pdf);
      return Promise.resolve({
        model,
        dropped: options.drop?.(model) ?? [],
        pageCount: 1,
        fits: true,
        pdf,
      });
    },
  };
}
