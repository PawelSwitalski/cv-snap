import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadPdf } from "./download";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("downloadPdf", () => {
  it("clicks a hidden anchor with the file name and releases the blob URL afterwards", () => {
    vi.useFakeTimers();
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:cv-snap/1");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const clicked: { href: string; download: string; inDocument: boolean }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push({
        href: this.href,
        download: this.download,
        inDocument: document.body.contains(this),
      });
    });
    const blob = new Blob(["%PDF-1.7"], { type: "application/pdf" });

    downloadPdf(blob, "CV_Jan_Testowy_Acme.pdf");

    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(clicked).toEqual([
      { href: "blob:cv-snap/1", download: "CV_Jan_Testowy_Acme.pdf", inDocument: true },
    ]);
    expect(document.querySelectorAll("a")).toHaveLength(0);
    expect(revokeUrl).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(revokeUrl).toHaveBeenCalledWith("blob:cv-snap/1");
  });
});
