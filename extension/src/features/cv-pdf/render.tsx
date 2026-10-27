import { pdf } from "@react-pdf/renderer";
import type { CvModel } from "./cv-model";
import { CvDocument } from "./CvDocument";
import { fitToTwoPages, type FitResult } from "./fit-to-pages";
import { refreshCvFonts } from "./fonts";

/**
 * Renders the CV to PDF bytes inside the extension. PDFs never cross native messaging (the host
 * returns JSON only; Chrome caps host messages at 1 MB). Fonts must be registered first
 * (`registerCvFonts`).
 */
export async function renderCvPdf(model: CvModel): Promise<Blob> {
  // Fresh font objects per document: reused ones garble "O" in the text layer (see refreshCvFonts).
  refreshCvFonts();
  return pdf(<CvDocument model={model} />).toBlob();
}

/**
 * Page count of a rendered PDF: page objects are uncompressed dictionaries in react-pdf's output
 * (`/Type /Page`, as opposed to `/Type /Pages`).
 */
export function countPdfPages(bytes: Uint8Array): number {
  const text = new TextDecoder("latin1").decode(bytes);
  return text.match(/\/Type\s*\/Page(?![a-z])/g)?.length ?? 0;
}

export async function measureCvPages(model: CvModel): Promise<number> {
  const blob = await renderCvPdf(model);
  return countPdfPages(new Uint8Array(await blob.arrayBuffer()));
}

/** Fits the CV to two pages with real render passes, then renders the final PDF. */
export async function renderFittedCv(model: CvModel): Promise<FitResult & { pdf: Blob }> {
  const fitted = await fitToTwoPages(model, measureCvPages);
  return { ...fitted, pdf: await renderCvPdf(fitted.model) };
}
