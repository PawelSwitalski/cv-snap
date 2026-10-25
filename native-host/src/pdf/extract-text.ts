import { CvSnapError, type PdfText } from "@cv-snap/shared";
import { layoutDocument, type PageItems, type TextItem } from "./layout.js";

/** Same limit as the upload UI (FR-3). */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;
/** Below this many non-space characters the PDF is treated as scanned/image-only. */
const MIN_TEXT_CHARS = 20;

const SCANNED_HINT = "This PDF has no selectable text (scanned PDFs aren't supported)";

/**
 * Extracts reading-order text from a CV PDF (story 006-pdf-text-extraction). Failures are
 * `PDF_PARSE_FAILED` with a reason: TOO_LARGE, NO_TEXT, PASSWORD_PROTECTED, CORRUPTED, UNREADABLE.
 */
export async function extractPdfText(
  pdfBase64: string,
  options: { signal?: AbortSignal } = {},
): Promise<PdfText> {
  const bytes = Buffer.from(pdfBase64, "base64");
  if (bytes.length > MAX_PDF_BYTES) {
    throw parseFailed("TOO_LARGE", "The PDF is larger than 10 MB");
  }
  if (bytes.length === 0) throw parseFailed("CORRUPTED", "The file is empty or not a PDF");

  // Loaded lazily so host start-up (and the health check) doesn't pay for pdf.js.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    // pdf.js 6 no longer evaluates font code, so there is no eval switch to turn off.
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: 0,
  });

  let document;
  try {
    document = await loadingTask.promise;
  } catch (error) {
    if (error instanceof pdfjs.PasswordException) {
      throw parseFailed("PASSWORD_PROTECTED", "The PDF is password-protected");
    }
    if (error instanceof pdfjs.InvalidPDFException) {
      throw parseFailed("CORRUPTED", "The file is damaged or not a PDF");
    }
    throw parseFailed("UNREADABLE", "The PDF could not be read");
  }

  try {
    const pages: PageItems[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      if (options.signal?.aborted) throw new CvSnapError("CANCELLED", "Request was cancelled");
      const page = await document.getPage(pageNumber);
      const [, , pageWidth = 0, pageHeight = 0] = page.view;
      const content = await page.getTextContent();
      const items: TextItem[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const [, , c = 0, d = 0, x = 0, y = 0] = item.transform as number[];
        items.push({
          text: item.str,
          x,
          y,
          width: item.width,
          fontSize: Math.hypot(c, d) || item.height,
        });
      }
      pages.push({ width: pageWidth, height: pageHeight, items });
      page.cleanup();
    }

    const text = layoutDocument(pages);
    if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS) throw parseFailed("NO_TEXT", SCANNED_HINT);
    return { text, pageCount: document.numPages };
  } catch (error) {
    if (error instanceof CvSnapError) throw error;
    throw parseFailed("UNREADABLE", "The PDF could not be read");
  } finally {
    await loadingTask.destroy();
  }
}

function parseFailed(reason: string, message: string): CvSnapError {
  return new CvSnapError("PDF_PARSE_FAILED", message, { reason });
}
