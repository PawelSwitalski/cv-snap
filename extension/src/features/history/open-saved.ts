import type { HistoryRepository } from "./history-repository";

/** Long enough for Chrome's PDF viewer to load the file; then the blob URL is released. */
export const PDF_URL_LIFETIME_MS = 60_000;

export interface OpenSavedApis {
  openTab: (url: string) => Promise<unknown>;
  pageUrl: (adKey: string) => string;
  createObjectUrl: (blob: Blob) => string;
  revokeObjectUrl: (url: string) => void;
  setTimeout: (callback: () => void, ms: number) => unknown;
}

export const browserOpenSavedApis = (): OpenSavedApis => ({
  openTab: (url) => browser.tabs.create({ url }),
  pageUrl: (adKey) => browser.runtime.getURL(`/history-page.html?id=${encodeURIComponent(adKey)}`),
  createObjectUrl: (blob) => URL.createObjectURL(blob),
  revokeObjectUrl: (url) => {
    URL.revokeObjectURL(url);
  },
  setTimeout: (callback, ms) => setTimeout(callback, ms),
});

/**
 * Opening saved files (story 004-open-saved-files): the PDF in Chrome's viewer from a `blob:` URL,
 * the page in cv-snap's viewer page. Returns false when the entry has no PDF (deleted).
 */
export async function openSavedPdf(
  history: Pick<HistoryRepository, "getPdf">,
  adKey: string,
  apis: OpenSavedApis = browserOpenSavedApis(),
): Promise<boolean> {
  const pdf = await history.getPdf(adKey);
  if (!pdf) return false;
  const url = apis.createObjectUrl(pdf);
  try {
    await apis.openTab(url);
  } finally {
    apis.setTimeout(() => {
      apis.revokeObjectUrl(url);
    }, PDF_URL_LIFETIME_MS);
  }
  return true;
}

export async function openSavedPage(
  adKey: string,
  apis: OpenSavedApis = browserOpenSavedApis(),
): Promise<void> {
  await apis.openTab(apis.pageUrl(adKey));
}
