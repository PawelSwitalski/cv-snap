/** Saves a rendered CV from the side panel: blob URL + anchor click, then the URL is released. */
export function downloadPdf(blob: Blob, fileName: string, doc: Document = document): void {
  const url = URL.createObjectURL(blob);
  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  doc.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoke after the click has been handled, or the download can be cancelled.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
