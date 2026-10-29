import { describe, expect, it } from "vitest";
import { bytesFile, JPEG_HEAD, PNG_HEAD, pdfFile } from "../../../test/panel-fixtures";
import { MAX_PHOTO_BYTES, validatePhoto } from "./photo";

describe("validatePhoto", () => {
  it.each([
    ["JPG", bytesFile(JPEG_HEAD, "me.jpg", "image/jpeg")],
    ["PNG", bytesFile(PNG_HEAD, "me.png", "image/png")],
  ])("accepts a %s", async (_label, file) => {
    expect(await validatePhoto(file)).toBeNull();
  });

  it("accepts exactly 2 MB and rejects anything larger", async () => {
    expect(
      await validatePhoto(bytesFile(PNG_HEAD, "a.png", "image/png", MAX_PHOTO_BYTES)),
    ).toBeNull();
    expect(
      await validatePhoto(bytesFile(PNG_HEAD, "a.png", "image/png", MAX_PHOTO_BYTES + 1)),
    ).toBe("TOO_LARGE");
  });

  it("rejects other file types, even when renamed", async () => {
    expect(await validatePhoto(pdfFile("me.png"))).toBe("NOT_IMAGE");
    expect(await validatePhoto(bytesFile([0x47, 0x49, 0x46, 0x38], "me.gif", "image/gif"))).toBe(
      "NOT_IMAGE",
    );
  });
});
