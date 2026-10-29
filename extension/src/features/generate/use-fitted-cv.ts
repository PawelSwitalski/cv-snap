import { useEffect, useRef, useState } from "react";
import type { CvModel } from "@/features/cv-pdf/cv-model";
import type { FitResult } from "@/features/cv-pdf/fit-to-pages";
import { logger } from "@/lib/logger";

/** Fitting to two pages runs real render passes, so edits are re-fitted after a pause in typing. */
export const REFIT_DEBOUNCE_MS = 400;

export type FittedCv = FitResult & { pdf: Blob };

/** Renders a model fitted to two pages, with the final PDF (bolt 009 `renderFittedCv`). */
export type RenderFitted = (model: CvModel) => Promise<FittedCv>;

export type FittedState =
  | { status: "rendering"; fitted: FittedCv | null }
  /** `source` is the model this result was fitted from: only for that model is it current. */
  | { status: "ready"; fitted: FittedCv; source: CvModel }
  | { status: "failed"; fitted: null };

/** The fitted result when it belongs to `model` (not to an earlier one still on screen). */
export function currentFit(state: FittedState, model: CvModel): FittedCv | null {
  return state.status === "ready" && state.source === model ? state.fitted : null;
}

/**
 * The fitted CV for the preview and the download (FR-13: the downloaded PDF is the one fitted
 * here, from the same model the preview shows). The first model renders at once, later ones after
 * `delayMs`; a render that a newer model replaced is discarded. Use `currentFit` to show or download
 * a result: one fitted from an earlier model no longer matches what the user sees.
 */
export function useFittedCv(
  model: CvModel,
  render: RenderFitted,
  delayMs: number = REFIT_DEBOUNCE_MS,
): FittedState {
  const [state, setState] = useState<FittedState>({ status: "rendering", fitted: null });
  const isFirst = useRef(true);

  useEffect(() => {
    let isCurrent = true;
    setState((previous) => ({ status: "rendering", fitted: previous.fitted }));
    const timer = setTimeout(
      () => {
        render(model).then(
          (fitted) => {
            if (isCurrent) setState({ status: "ready", fitted, source: model });
          },
          (error: unknown) => {
            logger.error("CV render failed", error instanceof Error ? error.name : "unknown");
            if (isCurrent) setState({ status: "failed", fitted: null });
          },
        );
      },
      isFirst.current ? 0 : delayMs,
    );
    isFirst.current = false;
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [model, render, delayMs]);

  return state;
}
