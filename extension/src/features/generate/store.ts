import {
  DEFAULT_MODEL,
  JobRequirementsSchema,
  LanguageCodeSchema,
  TailoringPlanSchema,
  type ErrorPayload,
  type LanguageCode,
  type LineId,
  type ModelId,
  type ProgressStep,
} from "@cv-snap/shared";
import { z } from "zod";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { GenerationResult } from "@/features/generation/generation-result";
import { logger } from "@/lib/logger";
import { SESSION_KEYS, type LocalStore } from "@/lib/storage/local-store";
import {
  connectGeneration,
  runGeneration,
  type ConnectGeneration,
  type RunningGeneration,
} from "./generation-client";
import { NO_CHANGES, type PreviewChanges } from "./preview-model";

export type GenerateStatus =
  | { kind: "idle" }
  | { kind: "running"; step: ProgressStep | null }
  | { kind: "result" }
  | { kind: "error"; error: ErrorPayload; isOffline: boolean };

/** What one click on Generate asked for; Try again / Regenerate repeat it. */
export interface GenerateRequest {
  /** The tab at click time: switching tabs during a run doesn't change the ad (story 005). */
  tabId: number;
  /** Output-language override for this generation only (FR-12); never a lasting setting. */
  override: LanguageCode | null;
}

export interface GenerateState {
  status: GenerateStatus;
  request: GenerateRequest | null;
  /** The last successful result; kept while regenerating or showing an error. */
  result: GenerationResult | null;
  changes: PreviewChanges;

  generate: (request: GenerateRequest) => void;
  /** Same tab and ad with another output language; cached requirements skip the parse call. */
  regenerate: (override: LanguageCode | null) => void;
  retry: () => void;
  cancel: () => void;
  /** Leaves the error: back to the result if there is one, else ready. */
  dismissError: () => void;
  editLine: (lineId: LineId, text: string) => void;
  removeLine: (lineId: LineId) => void;
  restoreLine: (lineId: LineId) => void;
  /** Shows the last result of this browser session again (panel reopened), if there is one. */
  restoreSession: () => Promise<void>;
  /** Forgets the result, e.g. when the active profile changed and the CV no longer matches it. */
  clearResult: () => void;
}

export type GenerateStore = StoreApi<GenerateState>;

export interface GenerateStoreDeps {
  connect?: ConnectGeneration;
  /** The model setting arrives with the settings panel (bolt 012). */
  model?: () => ModelId;
  isOnline?: () => boolean;
  watchdogMs?: number;
  /**
   * `chrome.storage.session`: the last result and its edits survive closing the panel, never reach
   * disk and are gone when Chrome closes. Without it, the result lives only in memory.
   */
  session?: LocalStore;
}

/** What is kept for the session; checked on read (the shape may change between versions). */
const SavedGenerationSchema = z.object({
  version: z.literal(1),
  request: z.object({
    tabId: z.number().int().nonnegative(),
    override: LanguageCodeSchema.nullable(),
  }),
  result: z.looseObject({
    plan: TailoringPlanSchema,
    requirements: JobRequirementsSchema,
    validation: z.looseObject({ results: z.array(z.unknown()) }),
  }),
  changes: z.object({ edits: z.record(z.string(), z.string()), removed: z.array(z.string()) }),
});

/** One store per side panel (story 005–007): the generation session and the preview edits. */
export function createGenerateStore(deps: GenerateStoreDeps = {}): GenerateStore {
  const connect = deps.connect ?? connectGeneration;
  const model = deps.model ?? (() => DEFAULT_MODEL);
  const isOnline = deps.isOnline ?? (() => navigator.onLine);
  /** The current run; handlers of a cancelled or replaced run compare their token and stop. */
  let current: { run: RunningGeneration | null } | null = null;
  /** The request that produced `result` (a later failed run must not replace it in the session). */
  let resultRequest: GenerateRequest | null = null;

  const store = createStore<GenerateState>()((set, get) => {
    const ready = (): GenerateStatus =>
      get().result === null ? { kind: "idle" } : { kind: "result" };

    const stop = () => {
      current?.run?.cancel();
      current = null;
    };

    const start = (request: GenerateRequest) => {
      stop();
      const token: { run: RunningGeneration | null } = { run: null };
      current = token;
      set({ status: { kind: "running", step: null }, request });
      token.run = runGeneration(
        connect,
        { type: "generate", tabId: request.tabId, override: request.override, model: model() },
        {
          onProgress: (step) => {
            if (current === token) set({ status: { kind: "running", step } });
          },
          onResult: (result) => {
            if (current !== token) return;
            current = null;
            resultRequest = request;
            set({ status: { kind: "result" }, result, changes: NO_CHANGES });
          },
          onError: (error) => {
            if (current !== token) return;
            current = null;
            set({ status: { kind: "error", error, isOffline: !isOnline() } });
          },
        },
        deps.watchdogMs,
      );
    };

    const updateChanges = (change: (changes: PreviewChanges) => PreviewChanges) => {
      set({ changes: change(get().changes) });
    };

    const restoreSession = async () => {
      if (!deps.session) return;
      const stored = await deps.session.get(SESSION_KEYS.lastGeneration).catch(() => undefined);
      if (stored === undefined) return;
      const parsed = SavedGenerationSchema.safeParse(stored);
      if (!parsed.success) {
        logger.warn("ignored an unreadable saved generation");
        return;
      }
      // The user may have started a new run while this was being read.
      if (get().result !== null || get().status.kind !== "idle") return;
      const saved = parsed.data;
      resultRequest = saved.request;
      set({
        status: { kind: "result" },
        request: saved.request,
        // Written by this store from a `GenerationResult`; the key parts were checked above.
        result: saved.result as unknown as GenerationResult,
        changes: saved.changes,
      });
    };

    return {
      status: { kind: "idle" },
      request: null,
      result: null,
      changes: NO_CHANGES,

      generate: start,
      regenerate: (override) => {
        const { request } = get();
        if (request) start({ ...request, override });
      },
      retry: () => {
        const { request } = get();
        if (request) start(request);
      },
      cancel: () => {
        stop();
        set({ status: ready() });
      },
      dismissError: () => {
        set({ status: ready() });
      },
      editLine: (lineId, text) => {
        updateChanges((changes) => ({ ...changes, edits: { ...changes.edits, [lineId]: text } }));
      },
      removeLine: (lineId) => {
        updateChanges((changes) =>
          changes.removed.includes(lineId)
            ? changes
            : { ...changes, removed: [...changes.removed, lineId] },
        );
      },
      restoreLine: (lineId) => {
        updateChanges((changes) => ({
          ...changes,
          removed: changes.removed.filter((id) => id !== lineId),
        }));
      },
      restoreSession,
      clearResult: () => {
        set({
          result: null,
          changes: NO_CHANGES,
          status: get().status.kind === "running" ? get().status : { kind: "idle" },
        });
      },
    };
  });

  // Keeps the session copy in step with the result and its edits (a few kB per change).
  const session = deps.session;
  if (session) {
    store.subscribe((state, previous) => {
      if (state.result === previous.result && state.changes === previous.changes) return;
      const write =
        state.result === null || resultRequest === null
          ? session.remove(SESSION_KEYS.lastGeneration)
          : session.set(SESSION_KEYS.lastGeneration, {
              version: 1,
              request: resultRequest,
              result: state.result,
              changes: state.changes,
            });
      write.catch((error: unknown) => {
        logger.warn(
          "generation not kept for the session",
          error instanceof Error ? error.name : "unknown",
        );
      });
    });
  }
  return store;
}
